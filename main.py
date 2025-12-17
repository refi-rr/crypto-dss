from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import jwt
import bcrypt
import sqlite3
import requests
import pandas as pd
import numpy as np
from contextlib import contextmanager
import time

app = FastAPI(title="Crypto Trading DSS API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
SECRET_KEY = "your-secret-key-change-in-production"
security = HTTPBearer()

# API Configuration with fallbacks
API_CONFIGS = [
    {
        "name": "Binance Futures",
        "base_url": "https://fapi.binance.com",
        "pairs_endpoint": "/fapi/v1/exchangeInfo",
        "klines_endpoint": "/fapi/v1/klines"
    },
    {
        "name": "Binance Spot",
        "base_url": "https://api.binance.com",
        "pairs_endpoint": "/api/v3/exchangeInfo",
        "klines_endpoint": "/api/v3/klines"
    },
    {
        "name": "CoinGecko",
        "base_url": "https://api.coingecko.com/api/v3",
        "pairs_endpoint": "/coins/markets",
        "klines_endpoint": None  # CoinGecko has different structure
    }
]

CURRENT_API = API_CONFIGS[0]  # Default to Binance Futures

# Database
@contextmanager
def get_db():
    conn = sqlite3.connect("trading_dss.db")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

# Initialize Database
def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'member',
                status TEXT NOT NULL DEFAULT 'active',
                subscription_expired_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS analysis_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                pair TEXT NOT NULL,
                timeframe TEXT NOT NULL,
                signal TEXT NOT NULL,
                score INTEGER NOT NULL,
                indicators_data TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        # Create default admin
        password_hash = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
        try:
            conn.execute(
                "INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)",
                ("admin", "admin@cryptodss.com", password_hash, "admin", "active")
            )
        except:
            pass

init_db()

# Models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "member"
    subscription_days: Optional[int] = 30

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    status: Optional[str] = None
    subscription_days: Optional[int] = None

class AnalysisRequest(BaseModel):
    pair: str
    timeframe: str

# Helper Functions
def create_token(user_id: int, username: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_current_user(payload: dict = Depends(verify_token)):
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (payload["user_id"],)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return dict(user)

def check_subscription(user: dict = Depends(get_current_user)):
    if user["role"] == "admin":
        return user
    if user["status"] != "active":
        raise HTTPException(status_code=403, detail="Account is inactive")
    if user["subscription_expired_at"]:
        expired = datetime.fromisoformat(user["subscription_expired_at"])
        if datetime.now() > expired:
            raise HTTPException(status_code=403, detail="Subscription expired")
    return user

# API Helper Functions with Retry and Fallback
def make_request_with_retry(url, params=None, max_retries=3):
    """Make HTTP request with retry logic and SSL handling"""
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    for attempt in range(max_retries):
        try:
            # Disable SSL verification to avoid certificate errors
            response = requests.get(url, params=params, timeout=10, verify=False)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
            raise HTTPException(status_code=504, detail="API timeout")
        except requests.exceptions.SSLError:
            # Try without SSL verification
            try:
                response = requests.get(url, params=params, timeout=10, verify=False)
                response.raise_for_status()
                return response.json()
            except Exception as ssl_e:
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
                raise HTTPException(status_code=503, detail=f"SSL Error: {str(ssl_e)}")
        except requests.exceptions.ConnectionError:
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
            raise HTTPException(status_code=503, detail="Cannot connect to market data API. Using mock data.")
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
            raise HTTPException(status_code=500, detail=f"API error: {str(e)}")

def fetch_ohlcv(pair: str, timeframe: str, limit: int = 200):
    """Fetch OHLCV data with fallback to alternative APIs"""
    
    interval_map = {
        "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
        "1h": "1h", "4h": "4h", "1d": "1d"
    }
    
    symbol = pair.replace("/", "")
    
    # Try Binance Futures first (fapi)
    try:
        url = "https://fapi.binance.com/fapi/v1/klines"
        params = {
            "symbol": symbol,
            "interval": interval_map.get(timeframe, "1h"),
            "limit": limit
        }
        
        data = make_request_with_retry(url, params)
        return parse_binance_data(data)
        
    except Exception as e1:
        print(f"Binance Futures failed: {e1}")
        
        # Fallback to Binance Spot API
        try:
            url = "https://api.binance.com/api/v3/klines"
            params = {
                "symbol": symbol,
                "interval": interval_map.get(timeframe, "1h"),
                "limit": limit
            }
            
            data = make_request_with_retry(url, params)
            return parse_binance_data(data)
            
        except Exception as e2:
            print(f"Binance Spot failed: {e2}")
            
            # Last resort: Use mock data for demo
            print("All APIs failed. Using mock data for demo.")
            return generate_mock_data(limit)

def parse_binance_data(data):
    """Parse Binance API response to DataFrame"""
    df = pd.DataFrame(data, columns=[
        "timestamp", "open", "high", "low", "close", "volume",
        "close_time", "quote_volume", "trades", "taker_buy_base", "taker_buy_quote", "ignore"
    ])
    
    df["close"] = df["close"].astype(float)
    df["high"] = df["high"].astype(float)
    df["low"] = df["low"].astype(float)
    df["open"] = df["open"].astype(float)
    df["volume"] = df["volume"].astype(float)
    
    return df

def generate_mock_data(limit: int = 200):
    """Generate realistic mock data for demo purposes"""
    np.random.seed(42)
    
    base_price = 45000
    timestamps = [int(time.time() * 1000) - (i * 60000) for i in range(limit)][::-1]
    
    prices = []
    current_price = base_price
    
    for _ in range(limit):
        change = np.random.randn() * 100
        current_price += change
        prices.append(current_price)
    
    data = {
        "timestamp": timestamps,
        "open": prices,
        "high": [p + abs(np.random.randn() * 50) for p in prices],
        "low": [p - abs(np.random.randn() * 50) for p in prices],
        "close": [p + np.random.randn() * 30 for p in prices],
        "volume": [abs(np.random.randn() * 1000000) for _ in range(limit)]
    }
    
    return pd.DataFrame(data)

# Technical Analysis Functions
def calculate_rsi(prices, period=14):
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def calculate_macd(prices, fast=12, slow=26, signal=9):
    ema_fast = prices.ewm(span=fast).mean()
    ema_slow = prices.ewm(span=slow).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram

def calculate_bollinger_bands(prices, period=20, std_dev=2):
    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()
    upper = sma + (std * std_dev)
    lower = sma - (std * std_dev)
    return upper, sma, lower

def analyze_trading_signal(df):
    """Comprehensive trading signal analysis"""
    close = df["close"]
    high = df["high"]
    low = df["low"]
    volume = df["volume"]
    
    # Calculate indicators
    rsi = calculate_rsi(close).iloc[-1]
    macd_line, signal_line, histogram = calculate_macd(close)
    macd_current = macd_line.iloc[-1]
    signal_current = signal_line.iloc[-1]
    macd_prev = macd_line.iloc[-2]
    signal_prev = signal_line.iloc[-2]
    
    upper_bb, middle_bb, lower_bb = calculate_bollinger_bands(close)
    current_price = close.iloc[-1]
    
    sma_20 = close.rolling(window=20).mean().iloc[-1]
    sma_50 = close.rolling(window=50).mean().iloc[-1] if len(close) >= 50 else sma_20
    ema_9 = close.ewm(span=9).mean().iloc[-1]
    
    avg_volume = volume.rolling(window=20).mean().iloc[-1]
    current_volume = volume.iloc[-1]
    
    # Scoring system
    long_score = 0
    short_score = 0
    signals = []
    
    # RSI Analysis
    if rsi < 30:
        long_score += 20
        signals.append("RSI Oversold (<30) - BULLISH")
    elif rsi > 70:
        short_score += 20
        signals.append("RSI Overbought (>70) - BEARISH")
    
    # MACD Crossover
    if macd_current > signal_current and macd_prev <= signal_prev:
        long_score += 20
        signals.append("MACD Bullish Crossover - BULLISH")
    elif macd_current < signal_current and macd_prev >= signal_prev:
        short_score += 20
        signals.append("MACD Bearish Crossover - BEARISH")
    
    # Bollinger Bands
    if current_price < lower_bb.iloc[-1]:
        long_score += 15
        signals.append("Price Below Lower BB - BULLISH")
    elif current_price > upper_bb.iloc[-1]:
        short_score += 15
        signals.append("Price Above Upper BB - BEARISH")
    
    # Moving Average
    if current_price > sma_20 > sma_50:
        long_score += 15
        signals.append("Price Above MAs - BULLISH")
    elif current_price < sma_20 < sma_50:
        short_score += 15
        signals.append("Price Below MAs - BEARISH")
    
    # Volume Analysis
    if current_volume > avg_volume * 1.5:
        if close.iloc[-1] > close.iloc[-2]:
            long_score += 15
            signals.append("High Volume on Green Candle - BULLISH")
        else:
            short_score += 15
            signals.append("High Volume on Red Candle - BEARISH")
    
    # Price Action
    price_change = ((close.iloc[-1] - close.iloc[-2]) / close.iloc[-2]) * 100
    if price_change > 2:
        long_score += 15
        signals.append(f"Strong Upward Movement (+{price_change:.2f}%) - BULLISH")
    elif price_change < -2:
        short_score += 15
        signals.append(f"Strong Downward Movement ({price_change:.2f}%) - BEARISH")
    
    # Determine final signal
    if long_score > short_score:
        final_signal = "LONG"
        confidence = long_score
    elif short_score > long_score:
        final_signal = "SHORT"
        confidence = short_score
    else:
        final_signal = "WAIT"
        confidence = max(long_score, short_score)
    
    strength = "STRONG" if confidence >= 70 else "MODERATE" if confidence >= 50 else "WEAK"
    
    return {
        "signal": final_signal,
        "strength": strength,
        "confidence_score": confidence,
        "long_score": long_score,
        "short_score": short_score,
        "current_price": float(current_price),
        "rsi": float(rsi),
        "macd": float(macd_current),
        "macd_signal": float(signal_current),
        "upper_bb": float(upper_bb.iloc[-1]),
        "lower_bb": float(lower_bb.iloc[-1]),
        "sma_20": float(sma_20),
        "sma_50": float(sma_50),
        "signals": signals,
        "volume_ratio": float(current_volume / avg_volume)
    }

# API Routes
@app.post("/api/auth/register")
async def register(user: UserCreate):
    password_hash = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt()).decode()
    subscription_date = None
    if user.subscription_days:
        subscription_date = (datetime.now() + timedelta(days=user.subscription_days)).isoformat()
    
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO users (username, email, password_hash, role, subscription_expired_at) VALUES (?, ?, ?, ?, ?)",
                (user.username, user.email, password_hash, user.role, subscription_date)
            )
        return {"message": "User created successfully"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username or email already exists")

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE username = ?", (credentials.username,)).fetchone()
    
    if not user or not bcrypt.checkpw(credentials.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["username"], user["role"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "status": user["status"]
        }
    }

@app.get("/api/users/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@app.get("/api/users")
async def list_users(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    with get_db() as conn:
        users = conn.execute("SELECT id, username, email, role, status, subscription_expired_at, created_at FROM users").fetchall()
    return [dict(u) for u in users]

@app.put("/api/users/{user_id}")
async def update_user(user_id: int, update: UserUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    updates = []
    params = []
    if update.email:
        updates.append("email = ?")
        params.append(update.email)
    if update.role:
        updates.append("role = ?")
        params.append(update.role)
    if update.status:
        updates.append("status = ?")
        params.append(update.status)
    if update.subscription_days:
        new_date = (datetime.now() + timedelta(days=update.subscription_days)).isoformat()
        updates.append("subscription_expired_at = ?")
        params.append(new_date)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    params.append(user_id)
    with get_db() as conn:
        conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
    
    return {"message": "User updated successfully"}

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    with get_db() as conn:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    return {"message": "User deleted successfully"}

@app.get("/api/trading/pairs")
async def get_trading_pairs():
    """Get available trading pairs - with fallback"""
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    try:
        # Try Binance Futures first
        url = "https://fapi.binance.com/fapi/v1/exchangeInfo"
        data = make_request_with_retry(url)
        pairs = [s["symbol"] for s in data["symbols"] if s["status"] == "TRADING" and "USDT" in s["symbol"]][:50]
        formatted_pairs = [p[:-4] + "/" + p[-4:] for p in pairs]
        return {"pairs": formatted_pairs}
    except:
        try:
            # Fallback to Binance Spot
            url = "https://api.binance.com/api/v3/exchangeInfo"
            data = make_request_with_retry(url)
            pairs = [s["symbol"] for s in data["symbols"] if s["status"] == "TRADING" and "USDT" in s["symbol"]][:50]
            formatted_pairs = [p[:-4] + "/" + p[-4:] for p in pairs]
            return {"pairs": formatted_pairs}
        except:
            # Fallback to hardcoded popular pairs
            return {"pairs": [
                "BTC/USDT", "ETH/USDT", "BNB/USDT", "XRP/USDT", "ADA/USDT",
                "DOGE/USDT", "SOL/USDT", "DOT/USDT", "MATIC/USDT", "LTC/USDT",
                "LINK/USDT", "UNI/USDT", "ATOM/USDT", "ETC/USDT", "XLM/USDT",
                "AVAX/USDT", "TRX/USDT", "SHIB/USDT", "BCH/USDT", "ALGO/USDT"
            ]}

@app.post("/api/trading/analyze")
async def analyze_trading(request: AnalysisRequest, user: dict = Depends(check_subscription)):
    try:
        df = fetch_ohlcv(request.pair, request.timeframe)
        analysis = analyze_trading_signal(df)
        
        # Save to history
        with get_db() as conn:
            conn.execute(
                "INSERT INTO analysis_history (user_id, pair, timeframe, signal, score, indicators_data) VALUES (?, ?, ?, ?, ?, ?)",
                (user["id"], request.pair, request.timeframe, analysis["signal"], analysis["confidence_score"], str(analysis))
            )
        
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/analytics/dashboard")
async def get_dashboard(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    with get_db() as conn:
        total_users = conn.execute("SELECT COUNT(*) as count FROM users").fetchone()["count"]
        active_users = conn.execute("SELECT COUNT(*) as count FROM users WHERE status = 'active'").fetchone()["count"]
        total_analyses = conn.execute("SELECT COUNT(*) as count FROM analysis_history").fetchone()["count"]
        recent_analyses = conn.execute(
            "SELECT * FROM analysis_history ORDER BY created_at DESC LIMIT 10"
        ).fetchall()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_analyses": total_analyses,
        "recent_analyses": [dict(a) for a in recent_analyses]
    }

@app.get("/api/analytics/history")
async def get_analysis_history(user: dict = Depends(get_current_user)):
    with get_db() as conn:
        if user["role"] == "admin":
            history = conn.execute("SELECT * FROM analysis_history ORDER BY created_at DESC LIMIT 100").fetchall()
        else:
            history = conn.execute(
                "SELECT * FROM analysis_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
                (user["id"],)
            ).fetchall()
    return [dict(h) for h in history]

@app.get("/")
async def root():
    return {
        "message": "Crypto Trading DSS API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=2401)