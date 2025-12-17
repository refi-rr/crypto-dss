#!/usr/bin/env python3
"""
Test script to verify all crypto APIs are working
"""

import requests
import time
from datetime import datetime
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def test_binance_futures():
    """Test Binance Futures API (fapi)"""
    print("\n🔍 Testing Binance Futures API...")
    try:
        url = "https://fapi.binance.com/fapi/v1/klines"
        params = {
            "symbol": "BTCUSDT",
            "interval": "1h",
            "limit": 5
        }
        
        start_time = time.time()
        # Disable SSL verification
        response = requests.get(url, params=params, timeout=10, verify=False)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            latest_close = float(data[-1][4])
            print(f"✅ SUCCESS - BTC Price: ${latest_close:,.2f}")
            print(f"   Response time: {elapsed:.2f}s")
            print(f"   Data points: {len(data)}")
            return True
        else:
            print(f"❌ FAILED - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        return False

def test_binance_spot():
    """Test Binance Spot API"""
    print("\n🔍 Testing Binance Spot API...")
    try:
        url = "https://api.binance.com/api/v3/klines"
        params = {
            "symbol": "BTCUSDT",
            "interval": "1h",
            "limit": 5
        }
        
        start_time = time.time()
        response = requests.get(url, params=params, timeout=10)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            latest_close = float(data[-1][4])
            print(f"✅ SUCCESS - BTC Price: ${latest_close:,.2f}")
            print(f"   Response time: {elapsed:.2f}s")
            print(f"   Data points: {len(data)}")
            return True
        else:
            print(f"❌ FAILED - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        return False

def test_bybit():
    """Test Bybit API"""
    print("\n🔍 Testing Bybit API...")
    try:
        url = "https://api.bybit.com/v5/market/kline"
        params = {
            "category": "linear",
            "symbol": "BTCUSDT",
            "interval": "60",
            "limit": 5
        }
        
        start_time = time.time()
        response = requests.get(url, params=params, timeout=10)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            if data.get('retCode') == 0:
                klines = data['result']['list']
                latest_close = float(klines[0][4])
                print(f"✅ SUCCESS - BTC Price: ${latest_close:,.2f}")
                print(f"   Response time: {elapsed:.2f}s")
                print(f"   Data points: {len(klines)}")
                return True
        print(f"❌ FAILED - Status: {response.status_code}")
        return False
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        return False

def test_okx():
    """Test OKX API"""
    print("\n🔍 Testing OKX API...")
    try:
        url = "https://www.okx.com/api/v5/market/candles"
        params = {
            "instId": "BTC-USDT",
            "bar": "1H",
            "limit": 5
        }
        
        start_time = time.time()
        response = requests.get(url, params=params, timeout=10)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            if data.get('code') == '0':
                klines = data['data']
                latest_close = float(klines[0][4])
                print(f"✅ SUCCESS - BTC Price: ${latest_close:,.2f}")
                print(f"   Response time: {elapsed:.2f}s")
                print(f"   Data points: {len(klines)}")
                return True
        print(f"❌ FAILED - Status: {response.status_code}")
        return False
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        return False

def test_coingecko():
    """Test CoinGecko API"""
    print("\n🔍 Testing CoinGecko API...")
    try:
        url = "https://api.coingecko.com/api/v3/simple/price"
        params = {
            "ids": "bitcoin",
            "vs_currencies": "usd"
        }
        
        start_time = time.time()
        response = requests.get(url, params=params, timeout=10)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            btc_price = data['bitcoin']['usd']
            print(f"✅ SUCCESS - BTC Price: ${btc_price:,.2f}")
            print(f"   Response time: {elapsed:.2f}s")
            print(f"   ⚠️  Note: This is current price only, not OHLC data")
            return True
        else:
            print(f"❌ FAILED - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        return False

def test_backend_api():
    """Test our own backend API"""
    print("\n🔍 Testing Backend API (Trading Pairs)...")
    try:
        url = "http://localhost:8000/api/trading/pairs"
        
        start_time = time.time()
        response = requests.get(url, timeout=10)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            pairs = data.get('pairs', [])
            print(f"✅ SUCCESS - {len(pairs)} pairs available")
            print(f"   Response time: {elapsed:.2f}s")
            print(f"   Sample pairs: {', '.join(pairs[:5])}")
            return True
        else:
            print(f"❌ FAILED - Status: {response.status_code}")
            print(f"   Make sure backend is running: python main.py")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ ERROR - Backend not running")
        print(f"   Start backend: python main.py")
        return False
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        return False

def main():
    print("=" * 60)
    print("🚀 Crypto API Testing Script")
    print("=" * 60)
    print(f"📅 Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = {}
    
    # Test all APIs
    results['Binance Futures'] = test_binance_futures()
    time.sleep(1)  # Avoid rate limiting
    
    results['Binance Spot'] = test_binance_spot()
    time.sleep(1)
    
    results['Bybit'] = test_bybit()
    time.sleep(1)
    
    results['OKX'] = test_okx()
    time.sleep(1)
    
    results['CoinGecko'] = test_coingecko()
    time.sleep(1)
    
    results['Backend'] = test_backend_api()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    
    working = sum(1 for v in results.values() if v)
    total = len(results)
    
    for api, status in results.items():
        status_icon = "✅" if status else "❌"
        print(f"{status_icon} {api}: {'Working' if status else 'Failed'}")
    
    print("\n" + "=" * 60)
    print(f"✅ Working: {working}/{total} APIs")
    print(f"❌ Failed: {total - working}/{total} APIs")
    print("=" * 60)
    
    if results.get('Binance Futures') or results.get('Binance Spot'):
        print("\n✅ Your system should work! At least one API is accessible.")
    else:
        print("\n⚠️  Warning: Primary APIs are down!")
        print("   System will use mock data for demo purposes.")
    
    if not results.get('Backend'):
        print("\n❌ Backend is not running!")
        print("   Start it with: python main.py")
    
    print("\n🎯 Recommended: Use Binance Futures API (fapi) - Most reliable!")
    print("=" * 60)

if __name__ == "__main__":
    main()