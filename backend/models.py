from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal
from datetime import datetime

ScoringRule = Literal["highest_wins", "lowest_wins"]
GameStatus = Literal["waiting", "in_progress", "completed"]

class PlayerModel(BaseModel):
    id: str
    name: str
    connected: bool = True
    joined_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    joined_at_round: int = 1  # tracks which round the player joined in
    device_token: Optional[str] = None  # Persistent device lock token

class RoundModel(BaseModel):
    round_number: int
    scores: Dict[str, float]  # player_id -> score
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    note: Optional[str] = None

class AuditEditModel(BaseModel):
    round_number: int
    edited_by: str
    edited_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    old_scores: Dict[str, float]
    new_scores: Dict[str, float]

class GameModel(BaseModel):
    id: str  # 6-character code (e.g. A7K9D2)
    name: str
    host_id: str
    host_token: str  # secure token for host authentication
    scoring_rule: ScoringRule = "highest_wins"
    status: GameStatus = "waiting"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None
    last_activity_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    admission_locked: bool = False  # True when host is actively adding or editing round scores
    allow_players: bool = True  # True if new players can join
    allow_viewers: bool = True  # True if audience/spectators can join
    players: List[PlayerModel] = []
    rounds: List[RoundModel] = []
    audit_history: List[AuditEditModel] = []
    spectators: List[str] = []  # List of spectator device tokens

# Request & Response Schemas
class CreateGameRequest(BaseModel):
    name: str
    scoring_rule: ScoringRule = "highest_wins"
    host_name: Optional[str] = "Host"

class UpdateAccessSettingsRequest(BaseModel):
    allow_players: bool
    allow_viewers: bool

class JoinGameRequest(BaseModel):
    player_name: str
    device_token: Optional[str] = None

class JoinSpectatorRequest(BaseModel):
    device_token: Optional[str] = None

class AddRoundRequest(BaseModel):
    scores: Dict[str, float]
    note: Optional[str] = None

class EditRoundRequest(BaseModel):
    scores: Dict[str, float]
    note: Optional[str] = None

# Admin & Feedback Models
class FeedbackModel(BaseModel):
    id: str
    rating: int = 5
    category: str = "general"  # "bug", "suggestion", "general"
    message: str
    player_name: Optional[str] = "Anonymous"
    email: Optional[str] = None
    phone: Optional[str] = None
    game_id: Optional[str] = None
    status: str = "new"  # "new", "reviewed", "resolved"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    user_agent: Optional[str] = None

class CreateFeedbackRequest(BaseModel):
    rating: int = 5
    category: str = "general"
    message: str
    player_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    game_id: Optional[str] = None

class UpdateFeedbackStatusRequest(BaseModel):
    status: str  # "new", "reviewed", "resolved"

class MaintenanceConfigModel(BaseModel):
    is_active: bool = False
    message: str = "ScoreSync is currently undergoing scheduled maintenance. Please check back shortly!"
    scheduled_start: Optional[str] = None
    scheduled_end: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class UpdateMaintenanceRequest(BaseModel):
    is_active: bool = False
    message: Optional[str] = None
    scheduled_start: Optional[str] = None
    scheduled_end: Optional[str] = None

class PurgeStorageRequest(BaseModel):
    purge_type: str  # "stale_games" (0 rounds, >24h) or "completed_older_than_days"
    days: Optional[int] = 30

class BroadcastAlertRequest(BaseModel):
    message: str
    alert_type: Optional[str] = "info"  # "info", "warning", "maintenance"

class CreateAnnouncementRequest(BaseModel):
    message: str

