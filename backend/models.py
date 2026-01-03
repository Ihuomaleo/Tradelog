from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
import uuid

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

class Trade(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    currency_pair: str
    direction: str  # "long" or "short"
    entry_price: float
    exit_price: Optional[float] = None
    lot_size: float
    entry_time: datetime
    exit_time: Optional[datetime] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    notes: Optional[str] = None
    strategy: Optional[str] = None
    screenshot_url: Optional[str] = None
    profit_loss: Optional[float] = None
    profit_loss_pct: Optional[float] = None
    risk_reward: Optional[float] = None
    tagged_events: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())

class TradeCreate(BaseModel):
    currency_pair: str
    direction: str
    entry_price: float
    exit_price: Optional[float] = None
    lot_size: float
    entry_time: datetime
    exit_time: Optional[datetime] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    notes: Optional[str] = None
    strategy: Optional[str] = None

class TradeResponse(BaseModel):
    id: str
    user_id: str
    currency_pair: str
    direction: str
    entry_price: float
    exit_price: Optional[float]
    lot_size: float
    entry_time: datetime
    exit_time: Optional[datetime]
    stop_loss: Optional[float]
    take_profit: Optional[float]
    notes: Optional[str]
    strategy: Optional[str]
    screenshot_url: Optional[str]
    profit_loss: Optional[float]
    profit_loss_pct: Optional[float]
    risk_reward: Optional[float]
    tagged_events: List[str]
    created_at: datetime

class EconomicEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_name: str
    country: str
    timestamp: datetime
    impact_level: str  # "high", "medium", "low"
    forecast: Optional[float] = None
    previous: Optional[float] = None
    actual: Optional[float] = None
    affected_pairs: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())

class EconomicEventResponse(BaseModel):
    id: str
    event_name: str
    country: str
    timestamp: datetime
    impact_level: str
    forecast: Optional[float]
    previous: Optional[float]
    actual: Optional[float]
    affected_pairs: List[str]

class StatsResponse(BaseModel):
    total_trades: int
    win_rate: float
    total_profit_loss: float
    total_profit_loss_pct: float
    average_win: float
    average_loss: float
    best_trade: float
    worst_trade: float
    long_win_rate: float
    short_win_rate: float

class EquityPoint(BaseModel):
    date: str
    balance: float
    balance_pct: float

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse