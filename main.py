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
from fastapi import BackgroundTasks

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

# Email Configuration (Update with your SMTP settings)
EMAIL_CONFIG = {
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587,
    "sender_email": "your-email@gmail.com",
    "sender_password": "your-app-password",
    "sender_name": "CryptoDSS"
}

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
                status TEXT NOT NULL DEFAULT 'pending',
                subscription_expired_at TEXT,
                email_verified INTEGER DEFAULT 0,
                verification_token TEXT,
                reset_token TEXT,
                reset_token_expires TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Analysis history
        conn.execute("""
            CREATE TABLE IF NOT EXISTS analysis_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                pair TEXT NOT NULL,
                timeframe TEXT NOT NULL,
                signal TEXT NOT NULL,
                score INTEGER NOT NULL,
                entry_price REAL,
                indicators_data TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # NEW: Backtesting results table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS backtest_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                pair TEXT NOT NULL,
                timeframe TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                total_trades INTEGER,
                winning_trades INTEGER,
                losing_trades INTEGER,
                win_rate REAL,
                total_profit REAL,
                max_drawdown REAL,
                sharpe_ratio REAL,
                parameters TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # NEW: Signal tracking for win rate
        conn.execute("""
            CREATE TABLE IF NOT EXISTS signal_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                analysis_id INTEGER NOT NULL,
                signal TEXT NOT NULL,
                entry_price REAL NOT NULL,
                target_price REAL,
                stop_loss REAL,
                exit_price REAL,
                exit_time TEXT,
                result TEXT,
                profit_loss REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (analysis_id) REFERENCES analysis_history (id)
            )
        """)
        
        # NEW: Terms acceptance tracking
        conn.execute("""
            CREATE TABLE IF NOT EXISTS terms_acceptance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                terms_version TEXT NOT NULL,
                accepted_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # Create default admin
        password_hash = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
        try:
            conn.execute(
                "INSERT INTO users (username, email, password_hash, role, status, email_verified) VALUES (?, ?, ?, ?, ?, ?)",
                ("admin", "admin@cryptodss.com", password_hash, "admin", "active", 1)
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

class EmailVerification(BaseModel):
    token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

class AnalysisRequest(BaseModel):
    pair: str
    timeframe: str
    multi_timeframe: Optional[bool] = False

class BacktestRequest(BaseModel):
    pair: str
    timeframe: str
    start_date: str
    end_date: str
    initial_capital: Optional[float] = 10000

class SignalFeedback(BaseModel):
    analysis_id: int
    exit_price: float
    result: str  # 'win' or 'loss'

class TermsAcceptance(BaseModel):
    terms_version: str

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

# Email Functions
def send_email(to_email: str, subject: str, body: str):
    """Send email (configure with your SMTP)"""
    try:
        msg = MIMEMultipart()
        msg['From'] = f"{EMAIL_CONFIG['sender_name']} <{EMAIL_CONFIG['sender_email']}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        # In production, use actual SMTP
        # server = smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port'])
        # server.starttls()
        # server.login(EMAIL_CONFIG['sender_email'], EMAIL_CONFIG['sender_password'])
        # server.send_message(msg)
        # server.quit()
        
        print(f"Email would be sent to {to_email}: {subject}")
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

def fetch_ohlcv(pair: str, timeframe: str, limit: int = 500):
    interval_map = {
        "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
        "1h": "1h", "4h": "4h", "1d": "1d"
    }
    
    symbol = pair.replace("/", "")
    
    try:
        url = "https://fapi.binance.com/fapi/v1/klines"
        params = {
            "symbol": symbol,
            "interval": interval_map.get(timeframe, "1h"),
            "limit": limit
        }
        
        data = make_request_with_retry(url, params)
        return parse_binance_data(data)
    except:
        return generate_mock_data(limit)

def parse_binance_data(data):
    df = pd.DataFrame(data, columns=[
        "timestamp", "open", "high", "low", "close", "volume",
        "close_time", "quote_volume", "trades", "taker_buy_base", "taker_buy_quote", "ignore"
    ])
    
    df["close"] = df["close"].astype(float)
    df["high"] = df["high"].astype(float)
    df["low"] = df["low"].astype(float)
    df["open"] = df["open"].astype(float)
    df["volume"] = df["volume"].astype(float)
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit='ms')
    
    return df

def generate_mock_data(limit: int = 500):
    np.random.seed(42)
    base_price = 45000
    timestamps = pd.date_range(end=datetime.now(), periods=limit, freq='1H')
    
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

def calculate_atr(df, period=14):
    """Average True Range for volatility"""
    high_low = df['high'] - df['low']
    high_close = (df['high'] - df['close'].shift()).abs()
    low_close = (df['low'] - df['close'].shift()).abs()
    
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean()
    return atr

def detect_market_condition(df):
    """Detect if market is trending, ranging, or volatile"""
    close = df["close"]
    
    # ADX for trend strength
    high = df["high"]
    low = df["low"]
    
    # Simple trend detection using price position vs MAs
    sma_20 = close.rolling(window=20).mean()
    sma_50 = close.rolling(window=50).mean()
    
    current_price = close.iloc[-1]
    sma_20_val = sma_20.iloc[-1]
    sma_50_val = sma_50.iloc[-1]
    
    # Volatility using ATR
    atr = calculate_atr(df)
    atr_current = atr.iloc[-1]
    atr_avg = atr.mean()
    
    # Price range
    price_range = (close.max() - close.min()) / close.mean() * 100
    
    # Determine condition
    if atr_current > atr_avg * 1.5:
        condition = "VOLATILE"
        description = "High volatility - use wider stops"
    elif sma_20_val > sma_50_val and current_price > sma_20_val:
        condition = "TRENDING_UP"
        description = "Uptrend - favor long positions"
    elif sma_20_val < sma_50_val and current_price < sma_20_val:
        condition = "TRENDING_DOWN"
        description = "Downtrend - favor short positions"
    else:
        condition = "RANGING"
        description = "Sideways market - use range-bound strategies"
    
    return {
        "condition": condition,
        "description": description,
        "volatility": float(atr_current),
        "price_range": float(price_range)
    }

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
    
    # ATR for stop loss
    atr = calculate_atr(df).iloc[-1]
    
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
    
    # Market condition adjustment
    if market_condition:
        if market_condition["condition"] == "TRENDING_UP":
            long_score += 10
            signals.append(f"Market Trending Up - BULLISH")
        elif market_condition["condition"] == "TRENDING_DOWN":
            short_score += 10
            signals.append(f"Market Trending Down - BEARISH")
        elif market_condition["condition"] == "VOLATILE":
            signals.append(f"High Volatility - Use Caution")
    
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
    
    # Calculate stop loss and take profit
    if final_signal == "LONG":
        stop_loss = current_price - (atr * 2)
        take_profit = current_price + (atr * 3)
    elif final_signal == "SHORT":
        stop_loss = current_price + (atr * 2)
        take_profit = current_price - (atr * 3)
    else:
        stop_loss = None
        take_profit = None
    
    return {
        "signal": final_signal,
        "strength": strength,
        "confidence_score": confidence,
        "long_score": long_score,
        "short_score": short_score,
        "current_price": float(current_price),
        "stop_loss": float(stop_loss) if stop_loss else None,
        "take_profit": float(take_profit) if take_profit else None,
        "rsi": float(rsi),
        "macd": float(macd_current),
        "macd_signal": float(signal_current),
        "upper_bb": float(upper_bb.iloc[-1]),
        "lower_bb": float(lower_bb.iloc[-1]),
        "sma_20": float(sma_20),
        "sma_50": float(sma_50),
        "atr": float(atr),
        "signals": signals,
        "volume_ratio": float(current_volume / avg_volume),
        "market_condition": market_condition
    }

def multi_timeframe_analysis(pair: str, timeframes: List[str]):
    """Analyze multiple timeframes"""
    results = {}
    
    for tf in timeframes:
        df = fetch_ohlcv(pair, tf, limit=200)
        market_condition = detect_market_condition(df)
        analysis = analyze_trading_signal(df, market_condition)
        results[tf] = analysis
    
    # Aggregate signals
    signals = [results[tf]["signal"] for tf in timeframes]
    long_count = signals.count("LONG")
    short_count = signals.count("SHORT")
    
    if long_count > short_count:
        consensus = "LONG"
    elif short_count > long_count:
        consensus = "SHORT"
    else:
        consensus = "WAIT"
    
    return {
        "consensus": consensus,
        "timeframes": results,
        "alignment": f"{max(long_count, short_count)}/{len(timeframes)} timeframes agree"
    }

def backtest_strategy(pair: str, timeframe: str, start_date: str, end_date: str, initial_capital: float = 10000):
    """Backtest trading strategy"""
    df = fetch_ohlcv(pair, timeframe, limit=500)
    
    # Filter by date range
    df = df[(df['timestamp'] >= start_date) & (df['timestamp'] <= end_date)]
    
    if len(df) < 50:
        raise HTTPException(status_code=400, detail="Insufficient data for backtesting")
    
    capital = initial_capital
    position = None
    trades = []
    equity_curve = [initial_capital]
    
    for i in range(50, len(df)):
        # Get historical data up to current point
        hist_df = df.iloc[:i+1]
        
        # Analyze
        market_condition = detect_market_condition(hist_df)
        signal = analyze_trading_signal(hist_df, market_condition)
        
        current_price = df.iloc[i]['close']
        
        # Execute trades
        if position is None:
            if signal['signal'] == 'LONG' and signal['confidence_score'] >= 60:
                # Enter long
                position = {
                    'type': 'LONG',
                    'entry_price': current_price,
                    'stop_loss': signal['stop_loss'],
                    'take_profit': signal['take_profit'],
                    'entry_time': df.iloc[i]['timestamp']
                }
            elif signal['signal'] == 'SHORT' and signal['confidence_score'] >= 60:
                # Enter short
                position = {
                    'type': 'SHORT',
                    'entry_price': current_price,
                    'stop_loss': signal['stop_loss'],
                    'take_profit': signal['take_profit'],
                    'entry_time': df.iloc[i]['timestamp']
                }
        else:
            # Check exit conditions
            exit_trade = False
            exit_reason = ""
            
            if position['type'] == 'LONG':
                if current_price >= position['take_profit']:
                    exit_trade = True
                    exit_reason = "Take Profit"
                elif current_price <= position['stop_loss']:
                    exit_trade = True
                    exit_reason = "Stop Loss"
                elif signal['signal'] == 'SHORT':
                    exit_trade = True
                    exit_reason = "Signal Reversal"
            else:  # SHORT
                if current_price <= position['take_profit']:
                    exit_trade = True
                    exit_reason = "Take Profit"
                elif current_price >= position['stop_loss']:
                    exit_trade = True
                    exit_reason = "Stop Loss"
                elif signal['signal'] == 'LONG':
                    exit_trade = True
                    exit_reason = "Signal Reversal"
            
            if exit_trade:
                # Calculate profit/loss
                if position['type'] == 'LONG':
                    pnl = (current_price - position['entry_price']) / position['entry_price']
                else:
                    pnl = (position['entry_price'] - current_price) / position['entry_price']
                
                profit = capital * pnl * 0.95  # 5% for fees
                capital += profit
                
                trades.append({
                    'type': position['type'],
                    'entry_price': position['entry_price'],
                    'exit_price': current_price,
                    'entry_time': str(position['entry_time']),
                    'exit_time': str(df.iloc[i]['timestamp']),
                    'profit': profit,
                    'result': 'WIN' if profit > 0 else 'LOSS',
                    'exit_reason': exit_reason
                })
                
                position = None
                equity_curve.append(capital)
    
    # Calculate statistics
    total_trades = len(trades)
    winning_trades = len([t for t in trades if t['result'] == 'WIN'])
    losing_trades = len([t for t in trades if t['result'] == 'LOSS'])
    
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    total_profit = capital - initial_capital
    roi = (total_profit / initial_capital) * 100
    
    # Max drawdown
    peak = initial_capital
    max_dd = 0
    for equity in equity_curve:
        if equity > peak:
            peak = equity
        dd = (peak - equity) / peak * 100
        if dd > max_dd:
            max_dd = dd
    
    # Sharpe ratio (simplified)
    returns = pd.Series(equity_curve).pct_change().dropna()
    sharpe = (returns.mean() / returns.std()) * np.sqrt(252) if len(returns) > 0 and returns.std() > 0 else 0
    
    return {
        "total_trades": total_trades,
        "winning_trades": winning_trades,
        "losing_trades": losing_trades,
        "win_rate": round(win_rate, 2),
        "initial_capital": initial_capital,
        "final_capital": round(capital, 2),
        "total_profit": round(total_profit, 2),
        "roi": round(roi, 2),
        "max_drawdown": round(max_dd, 2),
        "sharpe_ratio": round(sharpe, 2),
        "trades": trades[-10:],  # Last 10 trades
        "equity_curve": [round(e, 2) for e in equity_curve[-50:]]  # Last 50 points
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

@app.post("/api/auth/register")
async def register(user: UserCreate, background_tasks: BackgroundTasks):
    password_hash = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt()).decode()
    subscription_date = None
    if user.subscription_days:
        subscription_date = (datetime.now() + timedelta(days=user.subscription_days)).isoformat()
    
    # Generate verification token
    verification_token = secrets.token_urlsafe(32)
    
    try:
        with get_db() as conn:
            cursor = conn.execute(
                """INSERT INTO users (username, email, password_hash, role, subscription_expired_at, 
                   email_verified, verification_token, status) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (user.username, user.email, password_hash, user.role, subscription_date, 0, verification_token, 'pending')
            )
            user_id = cursor.lastrowid
        
        # Send verification email
        verification_link = f"http://localhost:3000/verify?token={verification_token}"
        email_body = f"""
        <html>
        <body>
            <h2>Welcome to CryptoDSS!</h2>
            <p>Please verify your email by clicking the link below:</p>
            <a href="{verification_link}">Verify Email</a>
            <p>Or copy this link: {verification_link}</p>
        </body>
        </html>
        """
        background_tasks.add_task(send_email, user.email, "Verify Your Email - CryptoDSS", email_body)
        
        return {"message": "User created. Please check your email to verify your account.", "user_id": user_id}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username or email already exists")

@app.post("/api/auth/verify-email")
async def verify_email(verification: EmailVerification):
    with get_db() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE verification_token = ?", 
            (verification.token,)
        ).fetchone()
        
        if not user:
            raise HTTPException(status_code=400, detail="Invalid verification token")
        
        if user['email_verified']:
            return {"message": "Email already verified"}
        
        conn.execute(
            "UPDATE users SET email_verified = 1, status = 'active', verification_token = NULL WHERE id = ?",
            (user['id'],)
        )
    
    return {"message": "Email verified successfully"}

@app.post("/api/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest, background_tasks: BackgroundTasks):
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (request.email,)).fetchone()
        
        if not user:
            # Don't reveal if email exists
            return {"message": "If the email exists, a reset link will be sent"}
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        reset_expires = (datetime.now() + timedelta(hours=1)).isoformat()
        
        conn.execute(
            "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
            (reset_token, reset_expires, user['id'])
        )
    
    # Send reset email
    reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
    email_body = f"""
    <html>
    <body>
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="{reset_link}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
    </body>
    </html>
    """
    background_tasks.add_task(send_email, request.email, "Password Reset - CryptoDSS", email_body)
    
    return {"message": "If the email exists, a reset link will be sent"}

@app.post("/api/auth/reset-password")
async def reset_password(reset: PasswordReset):
    with get_db() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE reset_token = ?",
            (reset.token,)
        ).fetchone()
        
        if not user:
            raise HTTPException(status_code=400, detail="Invalid reset token")
        
        # Check expiration
        if user['reset_token_expires']:
            expires = datetime.fromisoformat(user['reset_token_expires'])
            if datetime.now() > expires:
                raise HTTPException(status_code=400, detail="Reset token expired")
        
        # Update password
        password_hash = bcrypt.hashpw(reset.new_password.encode(), bcrypt.gensalt()).decode()
        conn.execute(
            "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
            (password_hash, user['id'])
        )
    
    return {"message": "Password reset successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=2401)