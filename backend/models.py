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
    players: List[PlayerModel] = []
    rounds: List[RoundModel] = []
    audit_history: List[AuditEditModel] = []

# Request & Response Schemas
class CreateGameRequest(BaseModel):
    name: str
    scoring_rule: ScoringRule = "highest_wins"
    host_name: Optional[str] = "Host"

class JoinGameRequest(BaseModel):
    player_name: str
    device_token: Optional[str] = None

class AddRoundRequest(BaseModel):
    scores: Dict[str, float]
    note: Optional[str] = None

class EditRoundRequest(BaseModel):
    scores: Dict[str, float]
    note: Optional[str] = None
