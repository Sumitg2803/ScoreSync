import os
import json
import hmac
import hashlib
import random
import string
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path

import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header, Request, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .models import (
    GameModel, PlayerModel, RoundModel, AuditEditModel,
    CreateGameRequest, JoinGameRequest, AddRoundRequest, EditRoundRequest,
    JoinSpectatorRequest, UpdateAccessSettingsRequest,
    FeedbackModel, CreateFeedbackRequest, UpdateFeedbackStatusRequest,
    MaintenanceConfigModel, UpdateMaintenanceRequest,
    PurgeStorageRequest, BroadcastAlertRequest, CreateAnnouncementRequest,
    ChangePasswordRequest
)
from .database import get_database
from .scoring import calculate_leaderboard

app = FastAPI(title="ScoreSync Unified Server", version="1.0.0")

# CORS setup (permits local dev Vite port 5173 and same-origin production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_game_id() -> str:
    # 6-character clean alphanumeric code without confusing characters (0, O, 1, I)
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choice(chars) for _ in range(6))

# WebSocket Connection Manager for live game rooms, system broadcasts, and admin telemetry
class ConnectionManager:
    def __init__(self):
        self.active_rooms: Dict[str, List[WebSocket]] = {}
        self.admin_sockets: List[WebSocket] = []
        self.system_sockets: List[WebSocket] = []

    async def connect(self, game_id: str, websocket: WebSocket):
        await websocket.accept()
        if game_id not in self.active_rooms:
            self.active_rooms[game_id] = []
        self.active_rooms[game_id].append(websocket)
        asyncio.create_task(self.broadcast_admin_live_snapshot())

    def disconnect(self, game_id: str, websocket: WebSocket):
        if game_id in self.active_rooms:
            if websocket in self.active_rooms[game_id]:
                self.active_rooms[game_id].remove(websocket)
            if not self.active_rooms[game_id]:
                del self.active_rooms[game_id]
        try:
            asyncio.create_task(self.broadcast_admin_live_snapshot())
        except RuntimeError:
            pass

    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        self.admin_sockets.append(websocket)

    def disconnect_admin(self, websocket: WebSocket):
        if websocket in self.admin_sockets:
            self.admin_sockets.remove(websocket)

    async def connect_system(self, websocket: WebSocket):
        await websocket.accept()
        self.system_sockets.append(websocket)

    def disconnect_system(self, websocket: WebSocket):
        if websocket in self.system_sockets:
            self.system_sockets.remove(websocket)

    async def build_admin_live_snapshot(self) -> dict:
        db = get_database()
        cursor = db.games.find({"status": {"$in": ["waiting", "in_progress"]}}).sort("created_at", -1)
        games = await cursor.to_list(length=100)

        results = []
        for g in games:
            g_id = g.get("id", "")
            host_id = g.get("host_id", "")
            players = g.get("players", [])
            host_name = "Host"
            for p in players:
                if p.get("id") == host_id:
                    host_name = p.get("name", "Host")
                    break
            results.append({
                "id": g_id,
                "name": g.get("name", "ScoreSync Game"),
                "host_id": host_id,
                "host_name": host_name,
                "scoring_rule": g.get("scoring_rule", "highest_wins"),
                "status": g.get("status", "waiting"),
                "players_count": len(players),
                "rounds_count": len(g.get("rounds", [])),
                "spectators_count": len(g.get("spectators", [])),
                "connected_sockets": len(self.active_rooms.get(g_id, [])),
                "admission_locked": g.get("admission_locked", False),
                "allow_players": g.get("allow_players", True),
                "allow_viewers": g.get("allow_viewers", True),
                "created_at": g.get("created_at"),
                "last_activity_at": g.get("last_activity_at")
            })

        total_devices = sum(len(ws_list) for ws_list in self.active_rooms.values())
        active_rooms_conn = len([r for r, conns in self.active_rooms.items() if conns])
        return {
            "event": "ADMIN_LIVE_UPDATE",
            "active_games_count": len(results),
            "active_rooms_with_connections": active_rooms_conn,
            "total_connected_devices": total_devices,
            "active_games": results,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def close_room(self, game_id: str):
        conns = self.active_rooms.pop(game_id, [])
        for ws in conns:
            try:
                await ws.close(code=4000)
            except Exception:
                pass
        await self.broadcast_admin_live_snapshot()

    async def broadcast_admin_live_snapshot(self):
        if not self.admin_sockets:
            return
        try:
            snapshot = await self.build_admin_live_snapshot()
            payload = json.dumps(snapshot, default=str)
        except Exception:
            return

        async def send_admin(ws: WebSocket):
            try:
                await ws.send_text(payload)
            except Exception:
                self.disconnect_admin(ws)

        await asyncio.gather(*[send_admin(ws) for ws in list(self.admin_sockets)], return_exceptions=True)

    async def broadcast_game_update(self, game_id: str, event_type: str, game_data: dict, meta: Optional[dict] = None):
        try:
            asyncio.create_task(self.broadcast_admin_live_snapshot())
        except RuntimeError:
            pass

        if game_id not in self.active_rooms:
            return

        connections = list(self.active_rooms.get(game_id, []))
        if not connections:
            return

        # Strip MongoDB _id if present to guarantee clean JSON serialization
        clean_game_data = {k: v for k, v in game_data.items() if k != "_id"}
        message = {
            "event": event_type,
            "game": clean_game_data,
            "meta": meta or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        try:
            payload = json.dumps(message, default=str)
        except Exception as e:
            print(f"Error encoding broadcast payload: {e}")
            return

        async def send_to_client(ws: WebSocket):
            try:
                await ws.send_text(payload)
            except Exception:
                # Prune dead/stale socket immediately
                self.disconnect(game_id, ws)

        # Broadcast concurrently to all connected clients in parallel without blocking
        await asyncio.gather(*[send_to_client(conn) for conn in connections], return_exceptions=True)

    async def broadcast_global_alert(self, event_type: str, data: dict):
        # 1. Broadcast to all active game rooms
        room_ids = list(self.active_rooms.keys())
        for r_id in room_ids:
            await self.broadcast_game_update(r_id, event_type, {}, meta=data)

        # 2. Broadcast to all global website visitors (/ws/system)
        if self.system_sockets:
            payload = json.dumps({
                "event": event_type,
                "meta": data,
                "timestamp": datetime.utcnow().isoformat()
            }, default=str)

            async def send_sys(ws: WebSocket):
                try:
                    await ws.send_text(payload)
                except Exception:
                    self.disconnect_system(ws)

            await asyncio.gather(*[send_sys(ws) for ws in list(self.system_sockets)], return_exceptions=True)

manager = ConnectionManager()

# Background Task to auto-clean games with 1 hour of inactivity
import asyncio

async def auto_clean_expired_games_loop():
    while True:
        try:
            await asyncio.sleep(300)  # Check every 5 minutes
            db = get_database()
            now = datetime.utcnow()
            
            # Find all games and check expiration
            cursor = db.games.find({})
            async for game in cursor:
                # 1. Completed games inactive for > 1 hour
                if game.get("status") == "completed" and game.get("completed_at"):
                    try:
                        completed_dt = datetime.fromisoformat(game["completed_at"])
                        if now - completed_dt > timedelta(hours=1):
                            await db.games.delete_one({"id": game["id"]})
                            continue
                    except Exception:
                        pass
                
                # 2. Abandoned games (waiting/in_progress with no activity for > 2 hours)
                last_act = game.get("last_activity_at") or game.get("created_at")
                if last_act:
                    try:
                        act_dt = datetime.fromisoformat(last_act)
                        if now - act_dt > timedelta(hours=2):
                            await db.games.delete_one({"id": game["id"]})
                    except Exception:
                        pass
        except Exception:
            pass

@app.on_event("startup")
async def startup_event():
    # Start auto-cleanup worker in background
    asyncio.create_task(auto_clean_expired_games_loop())
async def verify_host_token(game_id: str, x_host_token: Optional[str] = Header(None)):
    db = get_database()
    game = await db.games.find_one({"id": game_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if not x_host_token or game.get("host_token") != x_host_token:
        raise HTTPException(status_code=403, detail="Unauthorized: Only the host can perform this action")
    return game

# ----------------- API Endpoints -----------------

@app.api_route("/health", methods=["GET", "HEAD", "OPTIONS"])
async def health_check():
    """UptimeRobot ping target to keep Render alive 24/7 (supports GET, HEAD, OPTIONS)"""
    return {"status": "healthy", "service": "ScoreSync", "timestamp": datetime.utcnow().isoformat()}

@app.post("/api/games/create")
async def create_game(req: CreateGameRequest):
    maint = await get_public_maintenance_status()
    if maint.get("is_active"):
        raise HTTPException(status_code=503, detail=maint.get("message") or "ScoreSync is currently under maintenance.")

    db = get_database()
    game_id = generate_game_id()
    
    # Ensure ID uniqueness
    while await db.games.find_one({"id": game_id}):
        game_id = generate_game_id()

    host_id = f"host_{secrets.token_hex(4)}"
    host_token = secrets.token_hex(16)
    
    host_player = PlayerModel(
        id=host_id,
        name=req.host_name or "Host",
        connected=True,
    )

    new_game = GameModel(
        id=game_id,
        name=req.name,
        host_id=host_id,
        host_token=host_token,
        scoring_rule=req.scoring_rule,
        status="waiting",
        players=[host_player],
        rounds=[],
        audit_history=[],
    )

    await db.games.insert_one(new_game.dict())
    asyncio.create_task(manager.broadcast_admin_live_snapshot())

    response_data = new_game.dict()
    # Provide leaderboard calculation
    response_data["leaderboard"] = calculate_leaderboard(new_game)
    return response_data

def _is_authorized_room_member(game: GameModel, host_token: Optional[str], device_token: Optional[str]) -> bool:
    if host_token and hmac.compare_digest(host_token, game.host_token):
        return True
    if device_token:
        if any(p.device_token and p.device_token == device_token for p in game.players):
            return True
        if game.allow_viewers and device_token in game.spectators:
            return True
    return False


@app.get("/api/games/{game_id}")
async def get_game(
    game_id: str,
    x_host_token: Optional[str] = Header(None),
    x_device_token: Optional[str] = Header(None),
):
    db = get_database()
    game_dict = await db.games.find_one({"id": game_id.upper()})
    if not game_dict:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = GameModel(**game_dict)

    # Strict privacy: if host disabled audience/viewers, block unauthorized reads (e.g. via DevTools/API)
    if not game.allow_viewers and not _is_authorized_room_member(game, x_host_token, x_device_token):
        raise HTTPException(
            status_code=403,
            detail="Room is private. Host has restricted access."
        )
    
    # Check 1-hour host-inactivity rule if completed
    if game.status == "completed" and game.completed_at:
        completed_dt = datetime.fromisoformat(game.completed_at)
        if datetime.utcnow() - completed_dt > timedelta(hours=1):
            await db.games.delete_one({"id": game.id})
            raise HTTPException(status_code=410, detail="Game expired due to inactivity")

    res = game.dict()
    # Mask private host_token from public player read-calls
    del res["host_token"]
    res["leaderboard"] = calculate_leaderboard(game)
    res["spectator_count"] = len(game.spectators)
    return res

@app.post("/api/games/{game_id}/join")
async def join_game(game_id: str, req: JoinGameRequest):
    db = get_database()
    game_dict = await db.games.find_one({"id": game_id.upper()})
    if not game_dict:
        raise HTTPException(status_code=404, detail="Game not found")

    game = GameModel(**game_dict)

    # 1. Check if this exact device is ALREADY in this game (Persistent Device Lock Reconnect)
    device_token = req.device_token or f"dev_{secrets.token_hex(12)}"
    existing_device_player = next((p for p in game.players if p.device_token and p.device_token == device_token), None)
    
    current_round = len(game.rounds) + 1
    
    if existing_device_player:
        player_id = existing_device_player.id
        existing_device_player.connected = True
        player_name = existing_device_player.name
    else:
        # Strictly enforce host admission permission BEFORE any name matching (prevents DevTools/name-hijack bypass)
        if not game.allow_players:
            if not game.allow_viewers:
                raise HTTPException(
                    status_code=403,
                    detail="Game room is locked. Host has closed all new entries."
                )
            raise HTTPException(
                status_code=403,
                detail="Host has closed entry for new players."
            )

        # Prevent impersonating an already-joined player's name from a different device
        existing_name_player = next(
            (p for p in game.players if p.name.strip().lower() == req.player_name.strip().lower()),
            None
        )
        if existing_name_player:
            raise HTTPException(
                status_code=409,
                detail="This player name is already taken in this room. Please choose another name."
            )

        # If admission is locked because Host is typing scores right now
        if game.admission_locked:
            raise HTTPException(
                status_code=423,
                detail="Host is entering scores right now. Please wait a moment until the new round starts!"
            )
        player_id = f"p_{secrets.token_hex(4)}"
        new_player = PlayerModel(
            id=player_id,
            name=req.player_name.strip(),
            connected=True,
            joined_at_round=current_round,
            device_token=device_token
        )
        game.players.append(new_player)
        player_name = new_player.name

    game.last_activity_at = datetime.utcnow().isoformat()
    await db.games.update_one({"id": game.id}, {"$set": game.dict()})

    game_res = game.dict()
    del game_res["host_token"]
    game_res["leaderboard"] = calculate_leaderboard(game)

    # Broadcast player joined update via WebSocket with toast metadata (only if newly added or reconnected)
    await manager.broadcast_game_update(
        game.id,
        "PLAYER_JOINED",
        game_res,
        meta={
            "playerName": player_name,
            "playerCount": len(game.players),
            "message": f"🎉 Player Joined: {player_name} has joined the game! ({len(game.players)} players)"
        }
    )

    return {
        "player_id": player_id,
        "device_token": device_token,
        "game": game_res
    }

@app.post("/api/games/{game_id}/join-spectator")
async def join_spectator(game_id: str, req: JoinSpectatorRequest):
    """Audience member joins to spectate an ongoing game (bypasses admission lock, no name required)"""
    db = get_database()
    game_dict = await db.games.find_one({"id": game_id.upper()})
    if not game_dict:
        raise HTTPException(status_code=404, detail="Game not found")

    game = GameModel(**game_dict)
    # Check host permission for audience/spectators
    if not game.allow_viewers:
        if not game.allow_players:
            raise HTTPException(
                status_code=403,
                detail="Game room is locked. Host has closed all new entries."
            )
        raise HTTPException(
            status_code=403,
            detail="Host has restricted audience entry for this game."
        )

    if game.status == "waiting":
        raise HTTPException(
            status_code=400,
            detail="Audience mode is only available for ongoing games. Game is currently in waiting room."
        )

    device_token = req.device_token or f"spec_{secrets.token_hex(12)}"
    if device_token not in game.spectators:
        game.spectators.append(device_token)
        game.last_activity_at = datetime.utcnow().isoformat()
        await db.games.update_one(
            {"id": game.id},
            {"$set": {"spectators": game.spectators, "last_activity_at": game.last_activity_at}}
        )

    game_res = game.dict()
    del game_res["host_token"]
    game_res["leaderboard"] = calculate_leaderboard(game)
    game_res["spectator_count"] = len(game.spectators)

    # Broadcast updated spectator count silently (no toast on join/leave)
    await manager.broadcast_game_update(
        game.id,
        "SPECTATOR_COUNT_CHANGED",
        game_res,
        meta={"spectator_count": len(game.spectators)}
    )

    return {
        "device_token": device_token,
        "game": game_res,
        "spectator_count": len(game.spectators)
    }

@app.post("/api/games/{game_id}/leave-spectator")
async def leave_spectator(game_id: str, device_token: Optional[str] = None):
    """Audience member exits spectator mode"""
    db = get_database()
    game_dict = await db.games.find_one({"id": game_id.upper()})
    if not game_dict:
        return {"status": "ok"}

    game = GameModel(**game_dict)
    if device_token and device_token in game.spectators:
        game.spectators.remove(device_token)
        game.last_activity_at = datetime.utcnow().isoformat()
        await db.games.update_one(
            {"id": game.id},
            {"$set": {"spectators": game.spectators, "last_activity_at": game.last_activity_at}}
        )

        game_res = game.dict()
        del game_res["host_token"]
        game_res["leaderboard"] = calculate_leaderboard(game)
        game_res["spectator_count"] = len(game.spectators)

        # Broadcast updated spectator count silently
        await manager.broadcast_game_update(
            game.id,
            "SPECTATOR_COUNT_CHANGED",
            game_res,
            meta={"spectator_count": len(game.spectators)}
        )
    return {"status": "ok", "spectator_count": len(game.spectators)}

@app.post("/api/games/{game_id}/access-settings")
async def update_access_settings(game_id: str, req: UpdateAccessSettingsRequest, x_host_token: Optional[str] = Header(None)):
    """Host updates room admission permissions (allow_players, allow_viewers)"""
    game_dict = await verify_host_token(game_id.upper(), x_host_token)
    db = get_database()
    game = GameModel(**game_dict)
    game.allow_players = req.allow_players
    game.allow_viewers = req.allow_viewers
    game.last_activity_at = datetime.utcnow().isoformat()

    await db.games.update_one(
        {"id": game.id},
        {"$set": {
            "allow_players": game.allow_players,
            "allow_viewers": game.allow_viewers,
            "last_activity_at": game.last_activity_at
        }}
    )

    game_res = game.dict()
    del game_res["host_token"]
    game_res["leaderboard"] = calculate_leaderboard(game)
    game_res["spectator_count"] = len(game.spectators)

    # Broadcast access settings change to all connected devices in the room
    await manager.broadcast_game_update(
        game.id,
        "ACCESS_SETTINGS_CHANGED",
        game_res,
        meta={
            "allow_players": game.allow_players,
            "allow_viewers": game.allow_viewers
        }
    )
    return game_res

@app.post("/api/games/{game_id}/lock-admission")
async def lock_admission(game_id: str, lock: bool, x_host_token: Optional[str] = Header(None)):
    """Locks or unlocks player admission when host is entering/editing scores"""
    game_dict = await verify_host_token(game_id.upper(), x_host_token)
    db = get_database()
    game = GameModel(**game_dict)
    game.admission_locked = lock
    await db.games.update_one({"id": game.id}, {"$set": {"admission_locked": lock}})
    return {"admission_locked": lock}

async def perform_host_transfer(game: GameModel, new_host: PlayerModel, db):
    """Core logic to transfer host ownership, scrub old host, and broadcast to all devices"""
    old_host = next((p for p in game.players if p.id == game.host_id), None)
    old_host_name = old_host.name if old_host else "Previous Host"
    new_host_name = new_host.name

    # Generate fresh host token for the new host
    new_token = secrets.token_hex(16)
    game.host_id = new_host.id
    game.host_token = new_token

    # Remove the old host from the game players list & scrub historical rounds
    game.players = [p for p in game.players if p.id != old_host.id] if old_host else game.players
    if old_host:
        for r in game.rounds:
            if old_host.id in r.scores:
                del r.scores[old_host.id]

    game.last_activity_at = datetime.utcnow().isoformat()
    await db.games.update_one({"id": game.id}, {"$set": game.dict()})

    game_res = game.dict()
    del game_res["host_token"]
    game_res["leaderboard"] = calculate_leaderboard(game)
    game_res["spectator_count"] = len(game.spectators)

    # Broadcast host transfer event to all connected devices
    await manager.broadcast_game_update(
        game.id,
        "HOST_TRANSFERRED",
        game_res,
        meta={
            "newHostId": new_host.id,
            "newHostToken": new_token,
            "oldHostName": old_host_name,
            "newHostName": new_host_name,
            "spectator_count": len(game.spectators),
            "message": f"👑 Host Transferred: {new_host_name} is now the Host! {old_host_name} has left."
        }
    )

    return {"status": "transferred", "new_host_id": new_host.id, "spectator_count": len(game.spectators)}

@app.post("/api/games/{game_id}/start-host-roulette")
async def start_host_roulette(game_id: str, x_host_token: Optional[str] = Header(None)):
    """Initiates a synchronized 5-second random host roulette broadcast to all connected devices"""
    game_dict = await verify_host_token(game_id.upper(), x_host_token)
    db = get_database()
    game = GameModel(**game_dict)

    candidates = [p for p in game.players if p.id != game.host_id]
    if not candidates:
        raise HTTPException(status_code=400, detail="No other players available to transfer host to")

    # Pick winner upfront
    winner = secrets.choice(candidates)
    old_host = next((p for p in game.players if p.id == game.host_id), None)
    old_host_name = old_host.name if old_host else "Host"

    # Prepare clean response data
    game_res = game.dict()
    del game_res["host_token"]
    game_res["leaderboard"] = calculate_leaderboard(game)
    game_res["spectator_count"] = len(game.spectators)

    # Broadcast HOST_ROULETTE_STARTED to all connected devices (Host, Players, Audience)
    await manager.broadcast_game_update(
        game.id,
        "HOST_ROULETTE_STARTED",
        game_res,
        meta={
            "candidates": [{"id": p.id, "name": p.name} for p in candidates],
            "winnerId": winner.id,
            "winnerName": winner.name,
            "durationMs": 5000,
            "oldHostName": old_host_name,
        }
    )

    # Schedule background execution of transfer after 5.2 seconds so animation finishes on all screens
    async def complete_roulette_transfer():
        try:
            await asyncio.sleep(5.2)
            latest = await db.games.find_one({"id": game.id})
            if latest:
                latest_game = GameModel(**latest)
                w = next((p for p in latest_game.players if p.id == winner.id), None)
                if w:
                    await perform_host_transfer(latest_game, w, db)
        except Exception as e:
            print(f"Error in complete_roulette_transfer: {e}")

    asyncio.create_task(complete_roulette_transfer())

    return {
        "status": "roulette_started",
        "winner_id": winner.id,
        "winner_name": winner.name,
        "duration_ms": 5000
    }

@app.post("/api/games/{game_id}/transfer-host")
async def transfer_host(game_id: str, new_host_id: str, x_host_token: Optional[str] = Header(None)):
    """Transfers host ownership manually to a chosen player and removes the previous host"""
    game_dict = await verify_host_token(game_id.upper(), x_host_token)
    db = get_database()
    game = GameModel(**game_dict)

    new_host = next((p for p in game.players if p.id == new_host_id), None)
    if not new_host:
        raise HTTPException(status_code=400, detail="Selected player not found in this game")

    return await perform_host_transfer(game, new_host, db)

@app.post("/api/games/{game_id}/leave")
async def leave_game(game_id: str, player_id: str):
    """Player exits game: removes player, deletes scores, and recalculates standings"""
    db = get_database()
    game_dict = await db.games.find_one({"id": game_id.upper()})
    if not game_dict:
        raise HTTPException(status_code=404, detail="Game not found")

    game = GameModel(**game_dict)
    leaving_player = next((p for p in game.players if p.id == player_id), None)
    if not leaving_player:
        return {"status": "already_left"}

    player_name = leaving_player.name
    # Remove player from players list
    game.players = [p for p in game.players if p.id != player_id]

    # Remove player's scores from all past rounds
    for r in game.rounds:
        if player_id in r.scores:
            del r.scores[player_id]

    game.last_activity_at = datetime.utcnow().isoformat()
    await db.games.update_one({"id": game.id}, {"$set": game.dict()})

    game_res = game.dict()
    del game_res["host_token"]
    game_res["leaderboard"] = calculate_leaderboard(game)

    # Broadcast player left update via WebSocket with toast metadata
    await manager.broadcast_game_update(
        game.id,
        "PLAYER_LEFT",
        game_res,
        meta={
            "playerName": player_name,
            "playerCount": len(game.players),
            "message": f"🚪 Player Left: {player_name} has exited the game ({len(game.players)} players remaining)"
        }
    )

    return {"status": "left", "player_id": player_id}

@app.post("/api/games/{game_id}/start")
async def start_game(game_id: str, x_host_token: Optional[str] = Header(None)):
    game_dict = await verify_host_token(game_id.upper(), x_host_token)
    db = get_database()
    
    game = GameModel(**game_dict)
    game.status = "in_progress"
    game.last_activity_at = datetime.utcnow().isoformat()

    await db.games.update_one({"id": game.id}, {"$set": game.dict()})

    game_res = game.dict()
    del game_res["host_token"]
    game_res["leaderboard"] = calculate_leaderboard(game)

    await manager.broadcast_game_update(game.id, "GAME_STARTED", game_res)
    return game_res

@app.post("/api/games/{game_id}/rounds")
async def add_round(game_id: str, req: AddRoundRequest, x_host_token: Optional[str] = Header(None)):
    game_dict = await verify_host_token(game_id.upper(), x_host_token)
    db = get_database()

    game = GameModel(**game_dict)
    round_number = len(game.rounds) + 1
    new_round = RoundModel(
        round_number=round_number,
        scores=req.scores,
        note=req.note
    )
    game.rounds.append(new_round)
    game.last_activity_at = datetime.utcnow().isoformat()

    await db.games.update_one({"id": game.id}, {"$set": game.dict()})

    game_res = game.dict()
    del game_res["host_token"]
    game_res["leaderboard"] = calculate_leaderboard(game)

    await manager.broadcast_game_update(game.id, "ROUND_ADDED", game_res)
    return game_res

@app.put("/api/games/{game_id}/rounds/{round_number}")
async def edit_round(game_id: str, round_number: int, req: EditRoundRequest, x_host_token: Optional[str] = Header(None)):
    """Historical round editing with audit history"""
    game_dict = await verify_host_token(game_id.upper(), x_host_token)
    db = get_database()

    game = GameModel(**game_dict)
    target_round = next((r for r in game.rounds if r.round_number == round_number), None)
    if not target_round:
        raise HTTPException(status_code=404, detail="Round not found")

    old_scores = dict(target_round.scores)
    target_round.scores = req.scores
    if req.note is not None:
        target_round.note = req.note

    audit_entry = AuditEditModel(
        round_number=round_number,
        edited_by=game.host_id,
        old_scores=old_scores,
        new_scores=req.scores
    )
    game.audit_history.append(audit_entry)
    game.last_activity_at = datetime.utcnow().isoformat()

    await db.games.update_one({"id": game.id}, {"$set": game.dict()})

    game_res = game.dict()
    del game_res["host_token"]
    game_res["leaderboard"] = calculate_leaderboard(game)

    await manager.broadcast_game_update(game.id, "ROUND_EDITED", game_res)
    return game_res

@app.post("/api/games/{game_id}/complete")
async def complete_game(game_id: str, x_host_token: Optional[str] = Header(None)):
    game_dict = await verify_host_token(game_id.upper(), x_host_token)
    db = get_database()

    game = GameModel(**game_dict)
    game.status = "completed"
    game.completed_at = datetime.utcnow().isoformat()
    game.last_activity_at = datetime.utcnow().isoformat()

    await db.games.update_one({"id": game.id}, {"$set": game.dict()})

    game_res = game.dict()
    del game_res["host_token"]
    game_res["leaderboard"] = calculate_leaderboard(game)

    await manager.broadcast_game_update(game.id, "GAME_COMPLETED", game_res)
    return game_res

@app.post("/api/games/{game_id}/play-again")
async def play_again(game_id: str, x_host_token: Optional[str] = Header(None)):
    """Reverts game back to waiting room, clears rounds, retains only the host and currently active connected players"""
    game_dict = await verify_host_token(game_id.upper(), x_host_token)
    db = get_database()

    game = GameModel(**game_dict)
    game.status = "waiting"
    game.rounds = []
    game.completed_at = None
    game.audit_history = []
    game.last_activity_at = datetime.utcnow().isoformat()

    # Retain all players for the fresh match, resetting their starting round to 1
    for p in game.players:
        p.joined_at_round = 1
        p.connected = True

    await db.games.update_one({"id": game.id}, {"$set": game.dict()})

    game_res = game.dict()
    del game_res["host_token"]
    game_res["leaderboard"] = calculate_leaderboard(game)
    game_res["spectator_count"] = len(game.spectators)

    # Broadcast to all connected devices to revert to waiting room
    await manager.broadcast_game_update(game.id, "GAME_RESET_TO_LOBBY", game_res)
    return game_res

@app.post("/api/games/{game_id}/reset")
async def reset_current_game(game_id: str, x_host_token: Optional[str] = Header(None)):
    """Start New Game / Home deletes only the current game as per specification"""
    await verify_host_token(game_id.upper(), x_host_token)
    db = get_database()
    await db.games.delete_one({"id": game_id.upper()})
    
    # Broadcast to all players that the game has ended and connection closed
    await manager.broadcast_game_update(game_id.upper(), "GAME_TERMINATED", {"id": game_id.upper()})
    return {"status": "deleted", "game_id": game_id.upper()}

# ----------------- Feedback & Public Maintenance APIs -----------------

@app.post("/api/feedback")
async def submit_feedback(req: CreateFeedbackRequest, request: Request):
    """Public endpoint for players and hosts to submit app feedback/bug reports"""
    maint = await get_public_maintenance_status()
    if maint.get("disable_feedback") or maint.get("master_shutdown"):
        raise HTTPException(
            status_code=503,
            detail=maint.get("message") or "Feedback and problem reports are temporarily paused for maintenance."
        )

    category = req.category if req.category in ["bug", "suggestion", "general"] else "general"
    clean_name = (req.player_name or "").strip()[:40]
    if category == "bug" and not clean_name:
        raise HTTPException(status_code=400, detail="Name is required when reporting a problem.")

    db = get_database()
    feedback_id = secrets.token_hex(6)
    feedback_doc = {
        "id": feedback_id,
        "rating": max(1, min(5, req.rating)),
        "category": category,
        "message": req.message.strip(),
        "player_name": clean_name or "Anonymous",
        "email": (req.email or "").strip()[:100] or None,
        "phone": (req.phone or "").strip()[:30] or None,
        "game_id": req.game_id.upper() if req.game_id else None,
        "status": "new",
        "created_at": datetime.utcnow().isoformat(),
        "user_agent": request.headers.get("user-agent", "")[:120]
    }
    await db.feedbacks.insert_one(feedback_doc)
    return {"status": "success", "id": feedback_id, "message": "Thank you for your feedback!"}


# ----------------- Persistent 90-Day Announcements APIs -----------------

async def _prune_and_list_announcements():
    db = get_database()
    now_iso = datetime.utcnow().isoformat()
    # Remove any expired announcements (> 90 days old)
    await db.announcements.delete_many({"expires_at": {"$lte": now_iso}})
    cursor = db.announcements.find(
        {"expires_at": {"$gt": now_iso}},
        {"_id": 0, "expires_at_dt": 0}
    ).sort("created_at", -1)
    return await cursor.to_list(length=100)


@app.get("/api/announcements")
async def get_public_announcements():
    """Returns active announcements (auto-expires after 90 days)"""
    return await _prune_and_list_announcements()

def _parse_utc(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        from datetime import timezone
        clean = dt_str.strip()
        if clean.endswith("Z"):
            clean = clean[:-1] + "+00:00"
        dt = datetime.fromisoformat(clean)
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except Exception:
        return None


@app.get("/api/maintenance/status")
async def get_public_maintenance_status():
    """Returns current maintenance state for main app lockdown & countdown banners"""
    db = get_database()
    cfg = await db.system_config.find_one({"key": "maintenance"})
    if not cfg:
        return {
            "is_active": False,
            "disable_games": False,
            "disable_feedback": False,
            "master_shutdown": False,
            "raw_disable_games": False,
            "raw_disable_feedback": False,
            "raw_master_shutdown": False,
            "message": "ScoreSync is currently undergoing scheduled maintenance. Please check back shortly!",
            "scheduled_message": "ScoreSync has upcoming scheduled maintenance. Please plan ahead!",
            "scheduled_start": None,
            "scheduled_end": None
        }

    now_dt = datetime.utcnow()
    raw_master = bool(cfg.get("master_shutdown", False))
    raw_games = bool(cfg.get("disable_games", cfg.get("is_active", False)))
    raw_feedback = bool(cfg.get("disable_feedback", False))

    start = cfg.get("scheduled_start")
    end = cfg.get("scheduled_end")

    # Auto-activate when current UTC time is inside [scheduled_start, scheduled_end]
    schedule_active = False
    start_dt = _parse_utc(start)
    end_dt = _parse_utc(end)
    if start_dt and end_dt and start_dt <= now_dt <= end_dt:
        schedule_active = True
    elif start_dt and not end_dt and now_dt >= start_dt:
        schedule_active = True

    effective_games = raw_games or raw_master or schedule_active
    effective_feedback = raw_feedback or raw_master
    effective_active = effective_games or raw_master

    return {
        "is_active": effective_active,
        "disable_games": effective_games,
        "disable_feedback": effective_feedback,
        "master_shutdown": raw_master,
        "raw_disable_games": raw_games,
        "raw_disable_feedback": raw_feedback,
        "raw_master_shutdown": raw_master,
        "message": cfg.get("message", "ScoreSync is undergoing scheduled maintenance."),
        "scheduled_message": cfg.get("scheduled_message", "ScoreSync has upcoming scheduled maintenance. Please plan ahead!"),
        "scheduled_start": start,
        "scheduled_end": end
    }

# ----------------- Admin Security & Authentication -----------------

DEFAULT_ADMIN_EMAIL = "sumit.s.gaikwad28@gmail.com"
DEFAULT_ADMIN_PASSWORD_HASH = "pbkdf2_sha256:600000:cc0d2c6ddce7c305b47ab0e82c59c75e:56456ebc07839a371380e996ce735f5e96a7cd6f6c69141975225afe713a894f"
SESSION_TTL_HOURS = 24
failed_login_tracker: Dict[str, Dict[str, any]] = {}


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600000)
    return f"pbkdf2_sha256:600000:{salt.hex()}:{digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algo, iter_str, salt_hex, hash_hex = stored_hash.split(":")
        if algo != "pbkdf2_sha256":
            return False
        iterations = int(iter_str)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(candidate, expected)
    except Exception:
        return False


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def ensure_admin_user():
    """Seeds the primary admin user (hashed password) in MongoDB if admin_users is empty."""
    db = get_database()
    existing_count = await db.admin_users.count_documents({})
    if existing_count == 0:
        await db.admin_users.insert_one({
            "email": DEFAULT_ADMIN_EMAIL.lower(),
            "password_hash": DEFAULT_ADMIN_PASSWORD_HASH,
            "role": "superadmin",
            "created_at": datetime.utcnow().isoformat()
        })


@app.on_event("startup")
async def startup_seed_admin():
    try:
        await ensure_admin_user()
        db = get_database()
        # Automatically expire & delete announcements after 90 days via MongoDB TTL index
        await db.announcements.create_index("expires_at_dt", expireAfterSeconds=0)
    except Exception:
        pass


def check_ip_lockout(ip: str):
    record = failed_login_tracker.get(ip)
    if record:
        locked_until = record.get("locked_until")
        if locked_until and datetime.utcnow() < locked_until:
            wait_seconds = int((locked_until - datetime.utcnow()).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Locked out for {wait_seconds} more seconds."
            )

def record_failed_login(ip: str):
    now = datetime.utcnow()
    record = failed_login_tracker.get(ip, {"count": 0, "first_failed": now, "locked_until": None})
    # Reset if last failed attempt was over 15 minutes ago
    if (now - record["first_failed"]).total_seconds() > 900:
        record = {"count": 0, "first_failed": now, "locked_until": None}

    record["count"] += 1
    if record["count"] >= 5:
        record["locked_until"] = now + timedelta(minutes=15)
    failed_login_tracker[ip] = record

def reset_failed_login(ip: str):
    if ip in failed_login_tracker:
        del failed_login_tracker[ip]


def _extract_bearer_token(authorization: Optional[str], x_admin_token: Optional[str]) -> Optional[str]:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    if x_admin_token:
        return x_admin_token.strip()
    return None


async def verify_admin(
    authorization: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    token = _extract_bearer_token(authorization, x_admin_token)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in."
        )

    db = get_database()
    token_hash = hash_token(token)
    session = await db.admin_sessions.find_one({"token_hash": token_hash})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked session. Please log in again."
        )

    expires_at_str = session.get("expires_at")
    try:
        expires_at = datetime.fromisoformat(expires_at_str)
    except Exception:
        expires_at = datetime.min

    if datetime.utcnow() >= expires_at:
        await db.admin_sessions.delete_one({"_id": session["_id"]})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again."
        )

    return session.get("email")


@app.post("/api/admin/login")
async def admin_login(payload: dict, request: Request):
    """Admin portal login using email + hashed password stored in MongoDB"""
    client_ip = request.client.host if request.client else "unknown"
    check_ip_lockout(client_ip)

    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    await ensure_admin_user()
    db = get_database()
    user = await db.admin_users.find_one({"email": email})

    if not user or not verify_password(password, user.get("password_hash", "")):
        record_failed_login(client_ip)
        await db.admin_audit_logs.insert_one({
            "id": secrets.token_hex(6),
            "action": "failed_login",
            "details": {"email": email, "reason": "Invalid email or password"},
            "ip_address": client_ip,
            "timestamp": datetime.utcnow().isoformat()
        })
        raise HTTPException(status_code=401, detail="Invalid email or password")

    reset_failed_login(client_ip)
    session_token = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=SESSION_TTL_HOURS)

    await db.admin_sessions.insert_one({
        "token_hash": hash_token(session_token),
        "email": user["email"],
        "ip_address": client_ip,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat()
    })

    await db.admin_audit_logs.insert_one({
        "id": secrets.token_hex(6),
        "action": "admin_login",
        "details": {"email": user["email"], "status": "authenticated"},
        "ip_address": client_ip,
        "timestamp": now.isoformat()
    })
    return {
        "success": True,
        "token": session_token,
        "email": user["email"],
        "expires_at": expires_at.isoformat(),
        "message": "Authentication successful"
    }


@app.post("/api/admin/logout")
async def admin_logout(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    """Revokes active admin session token in MongoDB"""
    token = _extract_bearer_token(authorization, x_admin_token)
    if token:
        db = get_database()
        token_hash = hash_token(token)
        session = await db.admin_sessions.find_one_and_delete({"token_hash": token_hash})
        if session:
            client_ip = request.client.host if request.client else "unknown"
            await db.admin_audit_logs.insert_one({
                "id": secrets.token_hex(6),
                "action": "admin_logout",
                "details": {"email": session.get("email")},
                "ip_address": client_ip,
                "timestamp": datetime.utcnow().isoformat()
            })
    return {"success": True, "message": "Logged out"}


def validate_password_strength(password: str) -> Optional[str]:
    if len(password) < 8:
        return "Password must be at least 8 characters long."
    if not any(c.isupper() for c in password) or not any(c.islower() for c in password):
        return "Password must contain both uppercase and lowercase letters."
    if sum(1 for c in password if c.isdigit()) < 2:
        return "Password must contain at least 2 numbers."
    if not any(not c.isalnum() for c in password):
        return "Password must contain at least 1 special character."
    return None


@app.post("/api/admin/change-password")
async def admin_change_password(
    req: ChangePasswordRequest,
    request: Request,
    admin_email: str = Depends(verify_admin),
):
    """Changes admin password after verifying old password, enforcing complexity, and revoking all sessions"""
    client_ip = request.client.host if request.client else "unknown"
    check_ip_lockout(client_ip)

    db = get_database()
    user = await db.admin_users.find_one({"email": admin_email})
    if not user or not verify_password(req.old_password, user.get("password_hash", "")):
        record_failed_login(client_ip)
        await db.admin_audit_logs.insert_one({
            "id": secrets.token_hex(6),
            "action": "failed_password_change",
            "details": {"email": admin_email, "reason": "Incorrect old password"},
            "ip_address": client_ip,
            "timestamp": datetime.utcnow().isoformat()
        })
        raise HTTPException(status_code=400, detail="Current (old) password is incorrect.")

    if req.new_password == req.old_password:
        raise HTTPException(status_code=400, detail="New password must be different from your current password.")

    strength_error = validate_password_strength(req.new_password)
    if strength_error:
        raise HTTPException(status_code=400, detail=strength_error)

    reset_failed_login(client_ip)
    now_iso = datetime.utcnow().isoformat()
    new_hash = hash_password(req.new_password)

    await db.admin_users.update_one(
        {"email": admin_email},
        {"$set": {"password_hash": new_hash, "updated_at": now_iso}}
    )
    # Invalidate all active sessions for security
    await db.admin_sessions.delete_many({"email": admin_email})

    await db.admin_audit_logs.insert_one({
        "id": secrets.token_hex(6),
        "action": "password_changed",
        "details": {"email": admin_email, "sessions_revoked": True},
        "ip_address": client_ip,
        "timestamp": now_iso
    })

    return {
        "success": True,
        "message": "Password updated successfully. Please log in with your new password."
    }

# ----------------- Admin Real-Time Database & Storage Metrics -----------------

@app.get("/api/admin/system/metrics", dependencies=[Depends(verify_admin)])
async def get_system_metrics():
    """Returns actual real storage stats from MongoDB Atlas engine and live server devices"""
    db = get_database()
    
    # 1. Real latency measurement via direct ping roundtrip to MongoDB cluster
    t0 = time.time()
    await db.command("ping")
    db_latency_ms = round((time.time() - t0) * 1000, 1)

    # 2. Real database storage statistics directly from MongoDB dbstats
    try:
        db_stats = await db.command("dbstats")
        data_size = db_stats.get("dataSize", 0)
        storage_size = db_stats.get("storageSize", 0)
        index_size = db_stats.get("indexSize", 0)
        objects_count = db_stats.get("objects", 0)
        collections_count = db_stats.get("collections", 0)
    except Exception:
        data_size = 0
        storage_size = 0
        index_size = 0
        objects_count = 0
        collections_count = 0

    max_free_tier_bytes = 512 * 1024 * 1024  # 512 MB MongoDB Atlas Free Quota
    storage_percent = round((storage_size / max_free_tier_bytes) * 100, 2) if max_free_tier_bytes else 0

    # 3. Real connected devices across all rooms (Hosts + Players + Audience)
    total_connected_devices = sum(len(conns) for conns in manager.active_rooms.values())
    active_rooms_count = len(manager.active_rooms)

    # 4. Total games and feedbacks in DB
    total_games_count = await db.games.count_documents({})
    active_db_games = await db.games.count_documents({"status": {"$in": ["waiting", "in_progress"]}})
    total_feedbacks_count = await db.feedbacks.count_documents({})
    new_feedbacks_count = await db.feedbacks.count_documents({"status": "new"})

    return {
        "db_latency_ms": db_latency_ms,
        "storage": {
            "data_size_bytes": data_size,
            "storage_size_bytes": storage_size,
            "index_size_bytes": index_size,
            "total_used_bytes": storage_size + index_size,
            "max_quota_bytes": max_free_tier_bytes,
            "usage_percent": storage_percent,
            "objects_count": objects_count,
            "collections_count": collections_count
        },
        "live": {
            "connected_devices": total_connected_devices,
            "active_rooms_with_connections": active_rooms_count,
            "active_db_games": active_db_games,
            "total_games_all_time": total_games_count
        },
        "feedback": {
            "total_count": total_feedbacks_count,
            "new_count": new_feedbacks_count
        },
        "timestamp": datetime.utcnow().isoformat()
    }

# ----------------- Admin Analytics (1h, 1w, 1m, 1y, All) -----------------

@app.get("/api/admin/analytics", dependencies=[Depends(verify_admin)])
async def get_analytics(time_window: str = Query("1w", regex="^(1h|24h|1w|1m|1y|all)$")):
    """Computes real historical data analysis for played games over specified time range"""
    db = get_database()
    now = datetime.utcnow()

    if time_window == "1h":
        start_time = now - timedelta(hours=1)
    elif time_window == "24h":
        start_time = now - timedelta(days=1)
    elif time_window == "1w":
        start_time = now - timedelta(days=7)
    elif time_window == "1m":
        start_time = now - timedelta(days=30)
    elif time_window == "1y":
        start_time = now - timedelta(days=365)
    else:
        start_time = datetime(2020, 1, 1)

    start_iso = start_time.isoformat()
    cursor = db.games.find({"created_at": {"$gte": start_iso}})
    games_list = await cursor.to_list(length=1000)

    total_games = len(games_list)
    completed_games = sum(1 for g in games_list if g.get("status") == "completed")
    in_progress_games = sum(1 for g in games_list if g.get("status") == "in_progress")
    waiting_games = sum(1 for g in games_list if g.get("status") == "waiting")

    total_players = sum(len(g.get("players", [])) for g in games_list)
    total_rounds = sum(len(g.get("rounds", [])) for g in games_list)
    total_spectators = sum(len(g.get("spectators", [])) for g in games_list)

    rule_counts = {"highest_wins": 0, "lowest_wins": 0}
    for g in games_list:
        rule = g.get("scoring_rule", "highest_wins")
        if rule in rule_counts:
            rule_counts[rule] += 1

    # Generate timeline buckets for charts
    timeline = []
    bucket_map: Dict[str, dict] = {}

    for g in games_list:
        c_at = g.get("created_at", "")
        if not c_at:
            continue
        try:
            dt = datetime.fromisoformat(c_at)
            if time_window in ["1h", "24h"]:
                key = dt.strftime("%H:00")
            elif time_window in ["1w", "1m"]:
                key = dt.strftime("%b %d")
            else:
                key = dt.strftime("%Y-%m")
        except Exception:
            continue

        if key not in bucket_map:
            bucket_map[key] = {"label": key, "games": 0, "players": 0, "rounds": 0}
        bucket_map[key]["games"] += 1
        bucket_map[key]["players"] += len(g.get("players", []))
        bucket_map[key]["rounds"] += len(g.get("rounds", []))

    timeline = list(bucket_map.values())

    return {
        "time_window": time_window,
        "summary": {
            "total_games": total_games,
            "completed_games": completed_games,
            "in_progress_games": in_progress_games,
            "waiting_games": waiting_games,
            "total_players": total_players,
            "total_rounds": total_rounds,
            "total_spectators": total_spectators,
            "avg_players_per_game": round(total_players / total_games, 1) if total_games else 0,
            "avg_rounds_per_game": round(total_rounds / total_games, 1) if total_games else 0
        },
        "rules": rule_counts,
        "timeline": timeline
    }

# ----------------- Admin Active Games & Force-Close -----------------

@app.get("/api/admin/games/active", dependencies=[Depends(verify_admin)])
async def get_active_games():
    """Lists all active and in-progress games with real-time socket connections count"""
    db = get_database()
    cursor = db.games.find({"status": {"$in": ["waiting", "in_progress"]}}).sort("created_at", -1)
    games = await cursor.to_list(length=100)

    results = []
    for g in games:
        g_id = g.get("id", "")
        # Find host player name
        host_id = g.get("host_id", "")
        players = g.get("players", [])
        host_name = "Host"
        for p in players:
            if p.get("id") == host_id:
                host_name = p.get("name", "Host")
                break

        results.append({
            "id": g_id,
            "name": g.get("name", "ScoreSync Game"),
            "host_id": host_id,
            "host_name": host_name,
            "scoring_rule": g.get("scoring_rule", "highest_wins"),
            "status": g.get("status", "waiting"),
            "players_count": len(players),
            "rounds_count": len(g.get("rounds", [])),
            "spectators_count": len(g.get("spectators", [])),
            "connected_sockets": len(manager.active_rooms.get(g_id, [])),
            "admission_locked": g.get("admission_locked", False),
            "allow_players": g.get("allow_players", True),
            "allow_viewers": g.get("allow_viewers", True),
            "created_at": g.get("created_at"),
            "last_activity_at": g.get("last_activity_at")
        })
    return results

@app.delete("/api/admin/games/{game_id}", dependencies=[Depends(verify_admin)])
async def admin_terminate_game(game_id: str, request: Request):
    """Force-terminate an active game room and disconnect connected clients"""
    db = get_database()
    g_id = game_id.upper()
    existing = await db.games.find_one({"id": g_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Game not found")

    await db.games.delete_one({"id": g_id})
    await manager.broadcast_game_update(g_id, "GAME_TERMINATED", {"id": g_id})
    await manager.close_room(g_id)

    # Log admin action
    client_ip = request.client.host if request.client else "unknown"
    await db.admin_audit_logs.insert_one({
        "id": secrets.token_hex(6),
        "action": "game_force_closed",
        "details": {"game_id": g_id, "name": existing.get("name")},
        "ip_address": client_ip,
        "timestamp": datetime.utcnow().isoformat()
    })
    return {"status": "terminated", "game_id": g_id}


@app.post("/api/admin/games/{game_id}/broadcast", dependencies=[Depends(verify_admin)])
async def admin_broadcast_to_room(game_id: str, req: BroadcastAlertRequest, request: Request):
    """Broadcasts an admin message ONLY to all members connected inside a specific game room"""
    db = get_database()
    g_id = game_id.upper()
    existing = await db.games.find_one({"id": g_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Game not found")

    clean_msg = (req.message or "").strip()
    if not clean_msg:
        raise HTTPException(status_code=400, detail="Broadcast message cannot be empty")

    host_id = existing.get("host_id", "")
    host_name = "Host"
    for p in existing.get("players", []):
        if p.get("id") == host_id:
            host_name = p.get("name", "Host")
            break

    payload = {
        "id": secrets.token_hex(4),
        "game_id": g_id,
        "host_name": host_name,
        "message": clean_msg,
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast_game_update(g_id, "ROOM_ADMIN_MESSAGE", {}, meta=payload)

    client_ip = request.client.host if request.client else "unknown"
    await db.admin_audit_logs.insert_one({
        "id": secrets.token_hex(6),
        "action": "room_broadcast_sent",
        "details": payload,
        "ip_address": client_ip,
        "timestamp": datetime.utcnow().isoformat()
    })
    return {"status": "broadcast_sent", **payload}

# ----------------- Admin Storage Purge ("One-Click Purge") -----------------

@app.post("/api/admin/storage/purge", dependencies=[Depends(verify_admin)])
async def purge_storage(req: PurgeStorageRequest, request: Request):
    """Purges stale unplayed games or old completed matches to keep MongoDB free tier lean"""
    db = get_database()
    now = datetime.utcnow()
    deleted_count = 0

    if req.purge_type == "stale_games":
        # Delete games waiting with 0 rounds older than 24h
        cutoff = (now - timedelta(hours=24)).isoformat()
        res = await db.games.delete_many({
            "status": "waiting",
            "rounds": {"$size": 0},
            "created_at": {"$lt": cutoff}
        })
        deleted_count = res.deleted_count
    elif req.purge_type == "completed_older_than_days":
        days = max(1, req.days or 30)
        cutoff = (now - timedelta(days=days)).isoformat()
        res = await db.games.delete_many({
            "status": "completed",
            "created_at": {"$lt": cutoff}
        })
        deleted_count = res.deleted_count
    else:
        raise HTTPException(status_code=400, detail="Invalid purge_type. Use 'stale_games' or 'completed_older_than_days'")

    # Log action
    client_ip = request.client.host if request.client else "unknown"
    await db.admin_audit_logs.insert_one({
        "id": secrets.token_hex(6),
        "action": "storage_purged",
        "details": {"purge_type": req.purge_type, "deleted_count": deleted_count, "days": req.days},
        "ip_address": client_ip,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {
        "status": "success",
        "deleted_count": deleted_count,
        "purge_type": req.purge_type,
        "message": f"Successfully deleted {deleted_count} games from database."
    }

# ----------------- Admin Feedback Inbox -----------------

@app.get("/api/admin/feedbacks", dependencies=[Depends(verify_admin)])
async def get_feedbacks(
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status")
):
    db = get_database()
    query = {}
    if category and category in ["bug", "suggestion", "general"]:
        query["category"] = category
    if status_filter and status_filter in ["new", "reviewed", "resolved"]:
        query["status"] = status_filter

    cursor = db.feedbacks.find(query).sort("created_at", -1)
    feedbacks = await cursor.to_list(length=300)
    for f in feedbacks:
        if "_id" in f:
            del f["_id"]
    return feedbacks

@app.patch("/api/admin/feedbacks/{feedback_id}", dependencies=[Depends(verify_admin)])
async def update_feedback_status(feedback_id: str, req: UpdateFeedbackStatusRequest):
    db = get_database()
    if req.status not in ["new", "reviewed", "resolved"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.feedbacks.update_one({"id": feedback_id}, {"$set": {"status": req.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"status": "updated", "id": feedback_id, "new_status": req.status}

@app.delete("/api/admin/feedbacks/{feedback_id}", dependencies=[Depends(verify_admin)])
async def delete_feedback(feedback_id: str):
    db = get_database()
    res = await db.feedbacks.delete_one({"id": feedback_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"status": "deleted", "id": feedback_id}

# ----------------- Admin Persistent Announcements -----------------

@app.get("/api/admin/announcements", dependencies=[Depends(verify_admin)])
async def get_admin_announcements():
    return await _prune_and_list_announcements()


@app.post("/api/admin/announcements", dependencies=[Depends(verify_admin)])
async def create_admin_announcement(req: CreateAnnouncementRequest, request: Request):
    clean_msg = (req.message or "").strip()
    if not clean_msg:
        raise HTTPException(status_code=400, detail="Announcement message cannot be empty.")

    now = datetime.utcnow()
    expires_dt = now + timedelta(days=90)
    ann_id = secrets.token_hex(6)

    doc = {
        "id": ann_id,
        "message": clean_msg,
        "created_at": now.isoformat() + "Z",
        "expires_at": expires_dt.isoformat(),
        "expires_at_dt": expires_dt,
    }
    db = get_database()
    await db.announcements.insert_one(doc)
    await manager.broadcast_global_alert("ANNOUNCEMENTS_UPDATED", {"action": "created", "id": ann_id})

    client_ip = request.client.host if request.client else "unknown"
    await db.admin_audit_logs.insert_one({
        "id": secrets.token_hex(6),
        "action": "announcement_created",
        "details": {"id": ann_id, "message": clean_msg},
        "ip_address": client_ip,
        "timestamp": now.isoformat()
    })
    return {
        "id": ann_id,
        "message": clean_msg,
        "created_at": doc["created_at"],
        "expires_at": doc["expires_at"],
    }


@app.delete("/api/admin/announcements/{announcement_id}", dependencies=[Depends(verify_admin)])
async def delete_admin_announcement(announcement_id: str, request: Request):
    db = get_database()
    res = await db.announcements.delete_one({"id": announcement_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")

    await manager.broadcast_global_alert("ANNOUNCEMENTS_UPDATED", {"action": "deleted", "id": announcement_id})

    client_ip = request.client.host if request.client else "unknown"
    await db.admin_audit_logs.insert_one({
        "id": secrets.token_hex(6),
        "action": "announcement_deleted",
        "details": {"id": announcement_id},
        "ip_address": client_ip,
        "timestamp": datetime.utcnow().isoformat()
    })
    return {"status": "deleted", "id": announcement_id}


# ----------------- Admin Maintenance & Live Broadcast -----------------

@app.get("/api/admin/maintenance", dependencies=[Depends(verify_admin)])
async def get_admin_maintenance():
    public_status = await get_public_maintenance_status()
    start_dt = _parse_utc(public_status.get("scheduled_start"))
    end_dt = _parse_utc(public_status.get("scheduled_end"))
    now_dt = datetime.utcnow()

    schedule_status = "none"
    if start_dt and end_dt:
        if now_dt < start_dt:
            schedule_status = "scheduled"
        elif start_dt <= now_dt <= end_dt:
            schedule_status = "active"
        else:
            schedule_status = "expired"
    elif start_dt:
        schedule_status = "scheduled" if now_dt < start_dt else "active"

    return {
        **public_status,
        "effective_is_active": public_status["is_active"],
        "schedule_status": schedule_status,
    }

@app.post("/api/admin/maintenance", dependencies=[Depends(verify_admin)])
async def set_admin_maintenance(req: UpdateMaintenanceRequest, request: Request):
    """Sets granular shutdown modes (games, feedback, master) or scheduled maintenance"""
    start_dt = _parse_utc(req.scheduled_start)
    end_dt = _parse_utc(req.scheduled_end)

    if req.scheduled_start and not start_dt:
        raise HTTPException(status_code=400, detail="Invalid scheduled start time format.")
    if req.scheduled_end and not end_dt:
        raise HTTPException(status_code=400, detail="Invalid scheduled end time format.")
    if (start_dt and not end_dt) or (end_dt and not start_dt):
        raise HTTPException(status_code=400, detail="Both scheduled start time and end time are required.")
    if start_dt and end_dt and end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="Scheduled end time must be after scheduled start time.")

    db = get_database()
    is_games = bool(req.disable_games or req.is_active)
    is_feedback = bool(req.disable_feedback)
    is_master = bool(req.master_shutdown)

    doc = {
        "key": "maintenance",
        "is_active": is_games or is_master,
        "disable_games": is_games,
        "disable_feedback": is_feedback,
        "master_shutdown": is_master,
        "message": req.message or "ScoreSync is currently undergoing scheduled maintenance.",
        "scheduled_message": req.scheduled_message or "ScoreSync has upcoming scheduled maintenance. Please plan ahead!",
        "scheduled_start": req.scheduled_start,
        "scheduled_end": req.scheduled_end,
        "updated_at": datetime.utcnow().isoformat()
    }
    await db.system_config.update_one({"key": "maintenance"}, {"$set": doc}, upsert=True)

    effective_status = await get_public_maintenance_status()
    # Broadcast effective maintenance update event to all active game rooms and global system visitors instantly
    await manager.broadcast_global_alert("MAINTENANCE_UPDATE", effective_status)

    client_ip = request.client.host if request.client else "unknown"
    await db.admin_audit_logs.insert_one({
        "id": secrets.token_hex(6),
        "action": "maintenance_updated",
        "details": doc,
        "ip_address": client_ip,
        "timestamp": datetime.utcnow().isoformat()
    })
    return {"status": "success", "maintenance": effective_status}


@app.delete("/api/admin/maintenance/schedule", dependencies=[Depends(verify_admin)])
async def delete_admin_maintenance_schedule(request: Request):
    """Clears scheduled maintenance dates and broadcasts updated state to all screens"""
    db = get_database()
    await db.system_config.update_one(
        {"key": "maintenance"},
        {
            "$set": {
                "scheduled_start": None,
                "scheduled_end": None,
                "updated_at": datetime.utcnow().isoformat()
            }
        },
        upsert=True
    )

    effective_status = await get_public_maintenance_status()
    await manager.broadcast_global_alert("MAINTENANCE_UPDATE", effective_status)

    client_ip = request.client.host if request.client else "unknown"
    await db.admin_audit_logs.insert_one({
        "id": secrets.token_hex(6),
        "action": "maintenance_schedule_deleted",
        "details": {"scheduled_start": None, "scheduled_end": None},
        "ip_address": client_ip,
        "timestamp": datetime.utcnow().isoformat()
    })
    return {"status": "success", "maintenance": effective_status}

@app.post("/api/admin/broadcast", dependencies=[Depends(verify_admin)])
async def broadcast_live_alert(req: BroadcastAlertRequest, request: Request):
    """Dispatches a global live alert ticker across all active games immediately"""
    alert_payload = {
        "id": secrets.token_hex(4),
        "message": req.message,
        "alert_type": req.alert_type or "info",
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast_global_alert("GLOBAL_ANNOUNCEMENT", alert_payload)

    client_ip = request.client.host if request.client else "unknown"
    db = get_database()
    await db.admin_audit_logs.insert_one({
        "id": secrets.token_hex(6),
        "action": "global_broadcast_sent",
        "details": alert_payload,
        "ip_address": client_ip,
        "timestamp": datetime.utcnow().isoformat()
    })
    return {"status": "broadcast_sent", "payload": alert_payload}

# ----------------- Admin Security & Audit Trail -----------------

@app.get("/api/admin/security/audit", dependencies=[Depends(verify_admin)])
async def get_security_audit():
    """Retrieves recent admin security action logs and failed login attempt history"""
    db = get_database()
    cursor = db.admin_audit_logs.find().sort("timestamp", -1).limit(60)
    logs = await cursor.to_list(length=60)
    for l in logs:
        if "_id" in l:
            del l["_id"]

    return {
        "audit_logs": logs,
        "active_lockouts_count": sum(1 for v in failed_login_tracker.values() if v.get("locked_until") and v["locked_until"] > datetime.utcnow()),
        "tracked_failed_ips": len(failed_login_tracker)
    }

# ----------------- WebSocket Live Connection -----------------

@app.websocket("/ws/system")
async def system_websocket_endpoint(websocket: WebSocket):
    """Global system WebSocket for instant maintenance & announcement pushes on all screens"""
    await manager.connect_system(websocket)
    try:
        status_payload = await get_public_maintenance_status()
        await websocket.send_text(json.dumps({
            "event": "MAINTENANCE_UPDATE",
            "meta": status_payload,
            "timestamp": datetime.utcnow().isoformat()
        }, default=str))

        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except (WebSocketDisconnect, Exception):
        manager.disconnect_system(websocket)


@app.websocket("/ws/admin")
async def admin_websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    """Authenticated real-time WebSocket pushing instant active games & connected device counts"""
    if not token:
        await websocket.close(code=4001)
        return

    db = get_database()
    session = await db.admin_sessions.find_one({"token_hash": hash_token(token.strip())})
    if not session:
        await websocket.close(code=4001)
        return

    try:
        expires_at = datetime.fromisoformat(session.get("expires_at", ""))
    except Exception:
        expires_at = datetime.min
    if datetime.utcnow() >= expires_at:
        await websocket.close(code=4001)
        return

    await manager.connect_admin(websocket)
    try:
        snapshot = await manager.build_admin_live_snapshot()
        await websocket.send_text(json.dumps(snapshot, default=str))

        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except (WebSocketDisconnect, Exception):
        manager.disconnect_admin(websocket)


@app.websocket("/ws/{game_id}")
async def game_websocket_endpoint(
    websocket: WebSocket,
    game_id: str,
    device_token: Optional[str] = Query(None),
    host_token: Optional[str] = Query(None),
):
    db = get_database()
    game_dict = await db.games.find_one({"id": game_id.upper()})
    if game_dict:
        game = GameModel(**game_dict)
        if not game.allow_viewers and not _is_authorized_room_member(game, host_token, device_token):
            await websocket.close(code=4003)
            return

    await manager.connect(game_id.upper(), websocket)
    try:
        # Push immediate state hydration to newly connected or reconnected client
        game_dict = await db.games.find_one({"id": game_id.upper()})
        if game_dict:
            game = GameModel(**game_dict)
            game_res = game.dict()
            del game_res["host_token"]
            game_res["leaderboard"] = calculate_leaderboard(game)
            game_res["spectator_count"] = len(game.spectators)
            sync_msg = {
                "event": "SYNC_STATE",
                "game": game_res,
                "timestamp": datetime.utcnow().isoformat()
            }
            await websocket.send_text(json.dumps(sync_msg, default=str))

        while True:
            # Keep socket alive; clients can send heartbeat pings or reactions
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
            else:
                try:
                    payload = json.loads(data)
                    if payload.get("action") == "reaction":
                        emoji = payload.get("emoji")
                        if emoji and isinstance(emoji, str) and len(emoji) <= 4:
                            await manager.broadcast_game_update(
                                game_id.upper(),
                                "EMOJI_REACTION",
                                {},
                                meta={"emoji": emoji, "id": secrets.token_hex(4)}
                            )
                except Exception:
                    pass
    except (WebSocketDisconnect, Exception):
        manager.disconnect(game_id.upper(), websocket)

# ----------------- Serve Frontend (Single-Service Monolith) -----------------

frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD", "OPTIONS"])
    async def serve_react_app(full_path: str):
        # Don't intercept API or WS routes
        if full_path.startswith("api") or full_path.startswith("ws"):
            raise HTTPException(status_code=404)
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
