import requests
import sys
import json
from datetime import datetime, timedelta
import time

class ForexJournalAPITester:
    def __init__(self, base_url="https://tradelog-81.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"test_user_{int(time.time())}@example.com"
        self.test_user_password = "TestPass123!"
        self.test_user_name = "Test Trader"
        self.created_trade_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if files:
                # Remove Content-Type for file uploads
                headers.pop('Content-Type', None)
                
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "../health",  # Health endpoint is at root level
            200
        )
        return success

    def test_register(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "name": self.test_user_name,
                "email": self.test_user_email,
                "password": self.test_user_password
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_user_profile(self):
        """Test get current user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200
        )
        return success and response.get('email') == self.test_user_email

    def test_create_trade(self):
        """Test creating a new trade"""
        trade_data = {
            "currency_pair": "EURUSD",
            "direction": "long",
            "entry_price": 1.08500,
            "exit_price": 1.09250,
            "lot_size": 0.10,
            "entry_time": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
            "exit_time": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "stop_loss": 1.08000,
            "take_profit": 1.09500,
            "notes": "Test trade for API testing",
            "strategy": "Breakout"
        }
        
        success, response = self.run_test(
            "Create Trade",
            "POST",
            "trades",
            200,
            data=trade_data
        )
        
        if success and 'id' in response:
            self.created_trade_id = response['id']
            print(f"   Trade created with ID: {self.created_trade_id}")
            # Verify P&L calculation
            expected_pl = (1.09250 - 1.08500) * 0.10 * 100000  # Should be 75.0
            actual_pl = response.get('profit_loss', 0)
            print(f"   P&L calculated: ${actual_pl:.2f} (expected: ${expected_pl:.2f})")
            return True
        return False

    def test_get_trades(self):
        """Test getting user's trades"""
        success, response = self.run_test(
            "Get Trades",
            "GET",
            "trades",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} trades")
            return len(response) > 0
        return False

    def test_get_trade_detail(self):
        """Test getting specific trade details"""
        if not self.created_trade_id:
            print("❌ No trade ID available for detail test")
            return False
            
        success, response = self.run_test(
            "Get Trade Detail",
            "GET",
            f"trades/{self.created_trade_id}",
            200
        )
        
        return success and response.get('id') == self.created_trade_id

    def test_update_trade(self):
        """Test updating a trade"""
        if not self.created_trade_id:
            print("❌ No trade ID available for update test")
            return False
            
        update_data = {
            "currency_pair": "EURUSD",
            "direction": "long",
            "entry_price": 1.08500,
            "exit_price": 1.09500,  # Changed exit price
            "lot_size": 0.10,
            "entry_time": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
            "exit_time": (datetime.utcnow() - timedelta(minutes=30)).isoformat(),
            "stop_loss": 1.08000,
            "take_profit": 1.09500,
            "notes": "Updated test trade",
            "strategy": "Breakout Updated"
        }
        
        success, response = self.run_test(
            "Update Trade",
            "PUT",
            f"trades/{self.created_trade_id}",
            200,
            data=update_data
        )
        
        return success and response.get('notes') == "Updated test trade"

    def test_upload_screenshot(self):
        """Test screenshot upload"""
        if not self.created_trade_id:
            print("❌ No trade ID available for screenshot test")
            return False
            
        # Create a simple test image (1x1 pixel PNG)
        import io
        from PIL import Image
        
        # Create a small test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test_screenshot.png', img_bytes, 'image/png')}
        
        success, response = self.run_test(
            "Upload Screenshot",
            "POST",
            f"trades/{self.created_trade_id}/upload-screenshot",
            200,
            files=files
        )
        
        return success and 'screenshot_url' in response

    def test_analytics_stats(self):
        """Test analytics stats endpoint"""
        success, response = self.run_test(
            "Analytics Stats",
            "GET",
            "analytics/stats",
            200
        )
        
        if success:
            required_fields = ['total_trades', 'win_rate', 'total_profit_loss', 'average_win', 'average_loss']
            has_all_fields = all(field in response for field in required_fields)
            print(f"   Stats: {response.get('total_trades', 0)} trades, {response.get('win_rate', 0):.1f}% win rate")
            return has_all_fields
        return False

    def test_equity_curve(self):
        """Test equity curve endpoint"""
        success, response = self.run_test(
            "Equity Curve",
            "GET",
            "analytics/equity-curve",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Equity curve has {len(response)} data points")
            return True
        return False

    def test_economic_events_sync(self):
        """Test economic events sync (should handle missing API key gracefully)"""
        from_date = (datetime.utcnow() - timedelta(days=7)).strftime('%Y-%m-%d')
        to_date = datetime.utcnow().strftime('%Y-%m-%d')
        
        success, response = self.run_test(
            "Economic Events Sync",
            "POST",
            f"events/sync?from_date={from_date}&to_date={to_date}",
            200
        )
        
        # Should succeed even without API key
        return success and 'events_synced' in response

    def test_high_impact_events(self):
        """Test getting high impact events"""
        success, response = self.run_test(
            "High Impact Events",
            "GET",
            "events/high-impact?days=7",
            200
        )
        
        return success and isinstance(response, list)

    def test_forex_price(self):
        """Test forex price endpoint (should handle missing API key gracefully)"""
        success, response = self.run_test(
            "Forex Price",
            "GET",
            "forex/price/EURUSD",
            200
        )
        
        # Should succeed even without API key
        return success and 'symbol' in response

    def test_delete_trade(self):
        """Test deleting a trade"""
        if not self.created_trade_id:
            print("❌ No trade ID available for delete test")
            return False
            
        success, response = self.run_test(
            "Delete Trade",
            "DELETE",
            f"trades/{self.created_trade_id}",
            200
        )
        
        return success

    def test_invalid_auth(self):
        """Test endpoints with invalid authentication"""
        old_token = self.token
        self.token = "invalid_token"
        
        success, response = self.run_test(
            "Invalid Auth Test",
            "GET",
            "trades",
            401
        )
        
        self.token = old_token  # Restore valid token
        return success

def main():
    print("🚀 Starting Forex Trading Journal API Tests")
    print("=" * 50)
    
    tester = ForexJournalAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("User Registration", tester.test_register),
        ("User Login", tester.test_login),
        ("Get User Profile", tester.test_get_user_profile),
        ("Create Trade", tester.test_create_trade),
        ("Get Trades", tester.test_get_trades),
        ("Get Trade Detail", tester.test_get_trade_detail),
        ("Update Trade", tester.test_update_trade),
        ("Upload Screenshot", tester.test_upload_screenshot),
        ("Analytics Stats", tester.test_analytics_stats),
        ("Equity Curve", tester.test_equity_curve),
        ("Economic Events Sync", tester.test_economic_events_sync),
        ("High Impact Events", tester.test_high_impact_events),
        ("Forex Price", tester.test_forex_price),
        ("Invalid Auth Test", tester.test_invalid_auth),
        ("Delete Trade", tester.test_delete_trade),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print("\n✅ All tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())