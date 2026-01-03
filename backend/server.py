from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime, timedelta
import os
from pathlib import Path
from dotenv import load_dotenv
import base64
import httpx
from PIL import Image
import io

from models import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    TradeCreate, TradeResponse, Trade,
    EconomicEventResponse, StatsResponse, EquityPoint
)
from auth import (
    get_password_hash, verify_password, create_access_token, get_current_user
)
from database import connect_to_mongo, close_mongo_connection, get_database

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Load API keys
FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY", "")
ALPHA_VANTAGE_KEY = os.environ.get("ALPHA_VANTAGE_KEY", "")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth endpoints
@api_router.post("/auth/register", response_model=TokenResponse, tags=["auth"])
async def register(user_data: UserCreate, db=Depends(get_database)):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    from models import User
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        name=user_data.name
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    await db.users.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user.model_dump())
    )

@api_router.post("/auth/login", response_model=TokenResponse, tags=["auth"])
async def login(credentials: UserLogin, db=Depends(get_database)):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user)
    )

@api_router.get("/auth/me", response_model=UserResponse, tags=["auth"])
async def get_me(user_id: str = Depends(get_current_user), db=Depends(get_database)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return UserResponse(**user)

# Trade endpoints
@api_router.post("/trades", response_model=TradeResponse, tags=["trades"])
async def create_trade(
    trade_data: TradeCreate,
    user_id: str = Depends(get_current_user),
    db=Depends(get_database)
):
    trade = Trade(user_id=user_id, **trade_data.model_dump())
    
    # Calculate P&L if exit price exists
    if trade.exit_price:
        if trade.direction == "long":
            trade.profit_loss = (trade.exit_price - trade.entry_price) * trade.lot_size * 100000
            trade.profit_loss_pct = ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
        else:
            trade.profit_loss = (trade.entry_price - trade.exit_price) * trade.lot_size * 100000
            trade.profit_loss_pct = ((trade.entry_price - trade.exit_price) / trade.entry_price) * 100
        
        # Calculate R:R
        if trade.stop_loss:
            risk = abs(trade.entry_price - trade.stop_loss) * trade.lot_size * 100000
            if risk > 0:
                trade.risk_reward = abs(trade.profit_loss) / risk
    
    # Tag with economic events
    trade.tagged_events = await tag_trade_with_events(trade.entry_time, db)
    
    trade_dict = trade.model_dump()
    trade_dict['entry_time'] = trade_dict['entry_time'].isoformat()
    if trade_dict['exit_time']:
        trade_dict['exit_time'] = trade_dict['exit_time'].isoformat()
    trade_dict['created_at'] = trade_dict['created_at'].isoformat()
    
    await db.trades.insert_one(trade_dict)
    
    return TradeResponse(**trade.model_dump())

@api_router.get("/trades", response_model=List[TradeResponse], tags=["trades"])
async def get_trades(
    user_id: str = Depends(get_current_user),
    strategy: Optional[str] = None,
    currency_pair: Optional[str] = None,
    limit: int = Query(100, le=500),
    db=Depends(get_database)
):
    query = {"user_id": user_id}
    if strategy:
        query["strategy"] = strategy
    if currency_pair:
        query["currency_pair"] = currency_pair
    
    trades = await db.trades.find(query, {"_id": 0}).sort("entry_time", -1).limit(limit).to_list(limit)
    
    for trade in trades:
        if isinstance(trade.get('entry_time'), str):
            trade['entry_time'] = datetime.fromisoformat(trade['entry_time'])
        if trade.get('exit_time') and isinstance(trade['exit_time'], str):
            trade['exit_time'] = datetime.fromisoformat(trade['exit_time'])
        if isinstance(trade.get('created_at'), str):
            trade['created_at'] = datetime.fromisoformat(trade['created_at'])
    
    return [TradeResponse(**trade) for trade in trades]

@api_router.get("/trades/{trade_id}", response_model=TradeResponse, tags=["trades"])
async def get_trade(
    trade_id: str,
    user_id: str = Depends(get_current_user),
    db=Depends(get_database)
):
    trade = await db.trades.find_one({"id": trade_id, "user_id": user_id}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    if isinstance(trade.get('entry_time'), str):
        trade['entry_time'] = datetime.fromisoformat(trade['entry_time'])
    if trade.get('exit_time') and isinstance(trade['exit_time'], str):
        trade['exit_time'] = datetime.fromisoformat(trade['exit_time'])
    if isinstance(trade.get('created_at'), str):
        trade['created_at'] = datetime.fromisoformat(trade['created_at'])
    
    return TradeResponse(**trade)

@api_router.put("/trades/{trade_id}", response_model=TradeResponse, tags=["trades"])
async def update_trade(
    trade_id: str,
    trade_data: TradeCreate,
    user_id: str = Depends(get_current_user),
    db=Depends(get_database)
):
    existing_trade = await db.trades.find_one({"id": trade_id, "user_id": user_id})
    if not existing_trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    update_data = trade_data.model_dump()
    
    # Recalculate P&L
    if update_data.get('exit_price'):
        if update_data['direction'] == "long":
            update_data['profit_loss'] = (update_data['exit_price'] - update_data['entry_price']) * update_data['lot_size'] * 100000
            update_data['profit_loss_pct'] = ((update_data['exit_price'] - update_data['entry_price']) / update_data['entry_price']) * 100
        else:
            update_data['profit_loss'] = (update_data['entry_price'] - update_data['exit_price']) * update_data['lot_size'] * 100000
            update_data['profit_loss_pct'] = ((update_data['entry_price'] - update_data['exit_price']) / update_data['entry_price']) * 100
    
    update_data['entry_time'] = update_data['entry_time'].isoformat()
    if update_data.get('exit_time'):
        update_data['exit_time'] = update_data['exit_time'].isoformat()
    
    await db.trades.update_one({"id": trade_id}, {"$set": update_data})
    
    updated_trade = await db.trades.find_one({"id": trade_id}, {"_id": 0})
    if isinstance(updated_trade['entry_time'], str):
        updated_trade['entry_time'] = datetime.fromisoformat(updated_trade['entry_time'])
    if updated_trade.get('exit_time') and isinstance(updated_trade['exit_time'], str):
        updated_trade['exit_time'] = datetime.fromisoformat(updated_trade['exit_time'])
    if isinstance(updated_trade.get('created_at'), str):
        updated_trade['created_at'] = datetime.fromisoformat(updated_trade['created_at'])
    
    return TradeResponse(**updated_trade)

@api_router.delete("/trades/{trade_id}", tags=["trades"])
async def delete_trade(
    trade_id: str,
    user_id: str = Depends(get_current_user),
    db=Depends(get_database)
):
    result = await db.trades.delete_one({"id": trade_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trade not found")
    return {"message": "Trade deleted successfully"}

@api_router.post("/trades/{trade_id}/upload-screenshot", tags=["trades"])
async def upload_screenshot(
    trade_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    db=Depends(get_database)
):
    # Verify trade exists and belongs to user
    trade = await db.trades.find_one({"id": trade_id, "user_id": user_id})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    # Read and convert to base64
    contents = await file.read()
    
    # Compress image
    image = Image.open(io.BytesIO(contents))
    if image.mode in ('RGBA', 'LA'):
        image = image.convert('RGB')
    
    # Resize if too large
    max_size = (1200, 1200)
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    
    # Save to bytes
    output = io.BytesIO()
    image.save(output, format='JPEG', quality=85)
    output.seek(0)
    
    base64_image = base64.b64encode(output.read()).decode('utf-8')
    screenshot_url = f"data:image/jpeg;base64,{base64_image}"
    
    await db.trades.update_one({"id": trade_id}, {"$set": {"screenshot_url": screenshot_url}})
    
    return {"message": "Screenshot uploaded successfully", "screenshot_url": screenshot_url}

# Analytics endpoints
@api_router.get("/analytics/stats", response_model=StatsResponse, tags=["analytics"])
async def get_stats(
    user_id: str = Depends(get_current_user),
    db=Depends(get_database)
):
    trades = await db.trades.find({"user_id": user_id, "exit_price": {"$ne": None}}, {"_id": 0}).to_list(1000)
    
    if not trades:
        return StatsResponse(
            total_trades=0,
            win_rate=0,
            total_profit_loss=0,
            total_profit_loss_pct=0,
            average_win=0,
            average_loss=0,
            best_trade=0,
            worst_trade=0,
            long_win_rate=0,
            short_win_rate=0
        )
    
    total_trades = len(trades)
    wins = [t for t in trades if t.get('profit_loss', 0) > 0]
    losses = [t for t in trades if t.get('profit_loss', 0) <= 0]
    
    longs = [t for t in trades if t['direction'] == 'long']
    shorts = [t for t in trades if t['direction'] == 'short']
    long_wins = [t for t in longs if t.get('profit_loss', 0) > 0]
    short_wins = [t for t in shorts if t.get('profit_loss', 0) > 0]
    
    return StatsResponse(
        total_trades=total_trades,
        win_rate=(len(wins) / total_trades * 100) if total_trades > 0 else 0,
        total_profit_loss=sum(t.get('profit_loss', 0) for t in trades),
        total_profit_loss_pct=sum(t.get('profit_loss_pct', 0) for t in trades),
        average_win=sum(t.get('profit_loss', 0) for t in wins) / len(wins) if wins else 0,
        average_loss=sum(t.get('profit_loss', 0) for t in losses) / len(losses) if losses else 0,
        best_trade=max((t.get('profit_loss', 0) for t in trades), default=0),
        worst_trade=min((t.get('profit_loss', 0) for t in trades), default=0),
        long_win_rate=(len(long_wins) / len(longs) * 100) if longs else 0,
        short_win_rate=(len(short_wins) / len(shorts) * 100) if shorts else 0
    )

@api_router.get("/analytics/equity-curve", response_model=List[EquityPoint], tags=["analytics"])
async def get_equity_curve(
    user_id: str = Depends(get_current_user),
    db=Depends(get_database)
):
    trades = await db.trades.find(
        {"user_id": user_id, "exit_price": {"$ne": None}},
        {"_id": 0}
    ).sort("exit_time", 1).to_list(1000)
    
    if not trades:
        return []
    
    equity_curve = []
    cumulative_pl = 0
    initial_balance = 10000  # Default starting balance
    
    for trade in trades:
        cumulative_pl += trade.get('profit_loss', 0)
        current_balance = initial_balance + cumulative_pl
        
        exit_time = trade.get('exit_time')
        if isinstance(exit_time, str):
            exit_time = datetime.fromisoformat(exit_time)
        
        equity_curve.append(EquityPoint(
            date=exit_time.strftime('%Y-%m-%d') if exit_time else '',
            balance=current_balance,
            balance_pct=(cumulative_pl / initial_balance) * 100
        ))
    
    return equity_curve

# Economic events endpoints
@api_router.post("/events/sync", tags=["events"])
async def sync_economic_events(
    from_date: str = Query(..., description="YYYY-MM-DD"),
    to_date: str = Query(..., description="YYYY-MM-DD"),
    user_id: str = Depends(get_current_user),
    db=Depends(get_database)
):
    if not FINNHUB_API_KEY:
        return {"message": "Finnhub API key not configured", "events_synced": 0}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://finnhub.io/api/v1/calendar/economic",
                params={"from": from_date, "to": to_date, "token": FINNHUB_API_KEY},
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch events from Finnhub")
            
            data = response.json()
            events_data = data.get('economicCalendar', [])
            
            if not events_data:
                return {"message": "No events found", "events_synced": 0}
            
            high_impact_keywords = ['NFP', 'Non-Farm', 'FOMC', 'CPI', 'GDP', 'Interest Rate', 'Employment']
            
            from models import EconomicEvent
            events_to_insert = []
            
            for event in events_data:
                event_name = event.get('event', '')
                impact = 'low'
                
                for keyword in high_impact_keywords:
                    if keyword.lower() in event_name.lower():
                        impact = 'high'
                        break
                
                event_obj = EconomicEvent(
                    event_name=event_name,
                    country=event.get('country', ''),
                    timestamp=datetime.fromisoformat(event.get('time', datetime.utcnow().isoformat())),
                    impact_level=impact,
                    forecast=event.get('estimate'),
                    previous=event.get('prev'),
                    actual=event.get('actual'),
                    affected_pairs=get_affected_pairs(event.get('country', ''))
                )
                
                event_dict = event_obj.model_dump()
                event_dict['timestamp'] = event_dict['timestamp'].isoformat()
                event_dict['created_at'] = event_dict['created_at'].isoformat()
                events_to_insert.append(event_dict)
            
            if events_to_insert:
                await db.economic_events.insert_many(events_to_insert)
            
            return {"message": f"Synced {len(events_to_insert)} events", "events_synced": len(events_to_insert)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/events/high-impact", response_model=List[EconomicEventResponse], tags=["events"])
async def get_high_impact_events(
    days: int = Query(7, le=30),
    user_id: str = Depends(get_current_user),
    db=Depends(get_database)
):
    start_date = datetime.utcnow() - timedelta(days=days)
    
    events = await db.economic_events.find(
        {"impact_level": "high"},
        {"_id": 0}
    ).sort("timestamp", -1).limit(50).to_list(50)
    
    for event in events:
        if isinstance(event.get('timestamp'), str):
            event['timestamp'] = datetime.fromisoformat(event['timestamp'])
    
    return [EconomicEventResponse(**event) for event in events]

# Forex price endpoint
@api_router.get("/forex/price/{symbol}", tags=["forex"])
async def get_forex_price(
    symbol: str,
    user_id: str = Depends(get_current_user)
):
    if not ALPHA_VANTAGE_KEY:
        return {"symbol": symbol, "price": None, "message": "Alpha Vantage API key not configured"}
    
    try:
        # Convert symbol format (e.g., EURUSD to EUR/USD)
        from_currency = symbol[:3]
        to_currency = symbol[3:]
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.alphavantage.co/query",
                params={
                    "function": "CURRENCY_EXCHANGE_RATE",
                    "from_currency": from_currency,
                    "to_currency": to_currency,
                    "apikey": ALPHA_VANTAGE_KEY
                },
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch forex price")
            
            data = response.json()
            
            if "Realtime Currency Exchange Rate" in data:
                rate_data = data["Realtime Currency Exchange Rate"]
                return {
                    "symbol": symbol,
                    "price": float(rate_data.get("5. Exchange Rate", 0)),
                    "bid": float(rate_data.get("8. Bid Price", 0)),
                    "ask": float(rate_data.get("9. Ask Price", 0)),
                    "timestamp": rate_data.get("6. Last Refreshed")
                }
            else:
                return {"symbol": symbol, "price": None, "message": "Price data not available"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
async def tag_trade_with_events(entry_time: datetime, db) -> List[str]:
    """Find economic events within 30 minutes of trade entry"""
    time_window_start = entry_time - timedelta(minutes=30)
    time_window_end = entry_time + timedelta(minutes=30)
    
    events = await db.economic_events.find(
        {
            "timestamp": {
                "$gte": time_window_start.isoformat(),
                "$lte": time_window_end.isoformat()
            },
            "impact_level": "high"
        },
        {"_id": 0}
    ).to_list(10)
    
    return [event.get('event_name', '') for event in events]

def get_affected_pairs(country: str) -> List[str]:
    """Map country codes to affected currency pairs"""
    country_pairs = {
        "US": ["EURUSD", "GBPUSD", "USDJPY", "USDCAD", "AUDUSD", "NZDUSD"],
        "EUR": ["EURUSD", "EURGBP", "EURJPY", "EURCHF"],
        "GB": ["GBPUSD", "EURGBP", "GBPJPY"],
        "JP": ["USDJPY", "EURJPY", "GBPJPY"],
        "CA": ["USDCAD", "CADCHF"],
        "AU": ["AUDUSD", "AUDJPY"],
        "NZ": ["NZDUSD"],
        "CH": ["USDCHF", "EURCHF"]
    }
    return country_pairs.get(country, [])

app.include_router(api_router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "forex-trading-journal"}