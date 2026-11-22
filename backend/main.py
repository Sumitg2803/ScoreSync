import os
import json
import random
import string
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .models import (
    GameModel, PlayerModel, RoundModel, AuditEditModel,
    CreateGameRequest, JoinGameRequest, AddRoundRequest, EditRoundRequest
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

# WebSocket Connection Manager for live game rooms
class ConnectionManager:
    def __init__(self):
        self.active_rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, game_id: str, websocket: WebSocket):
        await websocket.accept()
        if game_id not in self.active_rooms:
            self.active_rooms[game_id] = []
        self.active_rooms[game_id].append(websocket)

    def disconnect(self, game_id: str, websocket: WebSocket):
        if game_id in self.active_rooms:
            if websocket in self.active_rooms[game_id]:
                self.active_rooms[game_id].remove(websocket)
            if not self.active_rooms[game_id]:
                del self.active_rooms[game_id]

    async def broadcast_game_update(self, game_id: str, event_type: str, game_data: dict, meta: Optional[dict] = None):
        if game_id in self.active_rooms:
            message = {
                "event": event_type,
                "game": game_data,
                "meta": meta or {},
                "timestamp": datetime.utcnow().isoformat()
            }
            payload = json.dumps(message)
            for connection in list(self.active_rooms[game_id]):
                try:
                    await connection.send_text(payload)
                except Exception:
                    pass

manager = ConnectionManager()

# Helper to verify host token
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

    response_data = new_game.dict()
    # Provide leaderboard calculation
    response_data["leaderboard"] = calculate_leaderboard(new_game)
    return response_data

@app.get("/api/games/{game_id}")
async def get_game(game_id: str):
    db = get_database()
    game_dict = await db.games.find_one({"id": game_id.upper()})
    if not game_dict:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = GameModel(**game_dict)
    
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
    return res

@app.post("/api/games/{game_id}/join")
async def join_game(game_id: str, req: JoinGameRequest):
    db = get_database()
    game_dict = await db.games.find_one({"id": game_id.upper()})
    if not game_dict:
        raise HTTPException(status_code=404, detail="Game not found")

    game = GameModel(**game_dict)

    # If game admission is locked (Host is currently typing scores)
    if game.admission_locked:
        raise HTTPException(
            status_code=423,
            detail="Host is entering scores right now. Please wait a moment until the new round starts!"
        )

    # Check if player name already in room
    existing_player = next((p for p in game.players if p.name.strip().lower() == req.player_name.strip().lower()), None)
    current_round = len(game.rounds) + 1
    
    if existing_player:
        # Re-attach existing player session
        player_id = existing_player.id
        existing_player.connected = True
        player_name = existing_player.name
    else:
        player_id = f"p_{secrets.token_hex(4)}"
        new_player = PlayerModel(
            id=player_id,
            name=req.player_name.strip(),
            connected=True,
            joined_at_round=current_round
        )
        game.players.append(new_player)
        player_name = new_player.name

    game.last_activity_at = datetime.utcnow().isoformat()
    await db.games.update_one({"id": game.id}, {"$set": game.dict()})

    game_res = game.dict()
    del game_res["host_token"]
    game_res["leaderboard"] = calculate_leaderboard(game)

    # Broadcast player joined update via WebSocket with toast metadata
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
        "game": game_res
    }

@app.post("/api/games/{game_id}/lock-admission")
async def lock_admission(game_id: str, lock: bool, x_host_token: Optional[str] = Header(None)):
    """Locks or unlocks player admission when host is entering/editing scores"""
    game_dict = await verify_host_token(game_id.upper(), x_host_token)
    db = get_database()
    game = GameModel(**game_dict)
    game.admission_locked = lock
    await db.games.update_one({"id": game.id}, {"$set": {"admission_locked": lock}})
    return {"admission_locked": lock}

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

    # Retain the host, and filter players who are currently connected
    active_players = [p for p in game.players if p.id == game.host_id or p.connected]
    game.players = active_players

    await db.games.update_one({"id": game.id}, {"$set": game.dict()})

    game_res = game.dict()
    del game_res["host_token"]
    game_res["leaderboard"] = calculate_leaderboard(game)

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

# ----------------- WebSocket Live Connection -----------------

@app.websocket("/ws/{game_id}")
async def game_websocket_endpoint(websocket: WebSocket, game_id: str):
    await manager.connect(game_id.upper(), websocket)
    try:
        while True:
            # Keep socket alive; clients can send heartbeat pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
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
