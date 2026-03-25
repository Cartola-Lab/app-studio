#!/usr/bin/env python3
"""
Backend API Testing for Cartola Lab Studio
Tests all API endpoints including SSE chat and mocked Paperclip integration
"""

import requests
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, List

class CartolaStudioAPITester:
    def __init__(self, base_url: str = "https://brostorm-studio.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append({"name": name, "details": details})
        print()

    def test_api_root(self) -> bool:
        """Test basic API connectivity"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            details = f"Status: {response.status_code}"
            if success and "message" in data:
                details += f", Message: {data['message']}"
            
            self.log_test("API Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("API Root Endpoint", False, f"Error: {str(e)}")
            return False

    def test_create_session(self) -> bool:
        """Test session creation"""
        try:
            response = requests.post(f"{self.api_url}/sessions", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if "session_id" in data:
                    self.session_id = data["session_id"]
                    details = f"Status: {response.status_code}, Session ID: {self.session_id[:8]}..."
                else:
                    success = False
                    details = "Missing session_id in response"
            else:
                details = f"Status: {response.status_code}"
            
            self.log_test("Create Session", success, details)
            return success
        except Exception as e:
            self.log_test("Create Session", False, f"Error: {str(e)}")
            return False

    def test_get_session(self) -> bool:
        """Test getting session by ID"""
        if not self.session_id:
            self.log_test("Get Session", False, "No session ID available")
            return False
        
        try:
            response = requests.get(f"{self.api_url}/sessions/{self.session_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Status: {response.status_code}, Messages: {len(data.get('messages', []))}"
            else:
                details = f"Status: {response.status_code}"
            
            self.log_test("Get Session", success, details)
            return success
        except Exception as e:
            self.log_test("Get Session", False, f"Error: {str(e)}")
            return False

    def test_chat_endpoint(self) -> bool:
        """Test SSE chat endpoint"""
        if not self.session_id:
            self.log_test("Chat Endpoint", False, "No session ID available")
            return False
        
        try:
            chat_data = {
                "messages": [
                    {"role": "user", "content": "Hello, can you help me build a simple landing page?"}
                ],
                "session_id": self.session_id
            }
            
            # Test SSE endpoint
            response = requests.post(
                f"{self.api_url}/chat",
                json=chat_data,
                headers={"Accept": "text/event-stream"},
                stream=True,
                timeout=30
            )
            
            success = response.status_code == 200
            
            if success:
                # Check if we get SSE data
                chunks_received = 0
                for line in response.iter_lines(decode_unicode=True):
                    if line.startswith("data: "):
                        chunks_received += 1
                        if chunks_received >= 3:  # Got some streaming data
                            break
                
                details = f"Status: {response.status_code}, Chunks received: {chunks_received}"
                success = chunks_received > 0
            else:
                details = f"Status: {response.status_code}"
            
            self.log_test("Chat SSE Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Chat SSE Endpoint", False, f"Error: {str(e)}")
            return False

    def test_create_task(self) -> bool:
        """Test mocked Paperclip create task endpoint"""
        try:
            task_data = {
                "title": "Test Landing Page",
                "description": "A simple landing page for testing purposes",
                "acceptance_criteria": [
                    "Page should load correctly",
                    "Navigation should work",
                    "Contact form should be functional"
                ],
                "preview_html": "<html><body><h1>Test Page</h1></body></html>",
                "preview_css": "body { font-family: Arial; }",
                "preview_js": "console.log('Test page loaded');"
            }
            
            response = requests.post(f"{self.api_url}/create-task", json=task_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = ["issue_id", "identifier", "url"]
                has_all_fields = all(field in data for field in required_fields)
                
                if has_all_fields:
                    details = f"Status: {response.status_code}, Task ID: {data['identifier']}"
                else:
                    success = False
                    details = f"Missing required fields: {[f for f in required_fields if f not in data]}"
            else:
                details = f"Status: {response.status_code}"
            
            self.log_test("Create Task (Mocked Paperclip)", success, details)
            return success
        except Exception as e:
            self.log_test("Create Task (Mocked Paperclip)", False, f"Error: {str(e)}")
            return False

    def test_get_tasks(self) -> bool:
        """Test getting all tasks"""
        try:
            response = requests.get(f"{self.api_url}/tasks", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                task_count = len(data.get("tasks", []))
                details = f"Status: {response.status_code}, Tasks found: {task_count}"
            else:
                details = f"Status: {response.status_code}"
            
            self.log_test("Get Tasks", success, details)
            return success
        except Exception as e:
            self.log_test("Get Tasks", False, f"Error: {str(e)}")
            return False

    def test_status_endpoints(self) -> bool:
        """Test status check endpoints"""
        try:
            # Create status check
            status_data = {"client_name": "test_client"}
            response = requests.post(f"{self.api_url}/status", json=status_data, timeout=10)
            create_success = response.status_code == 200
            
            if not create_success:
                self.log_test("Status Endpoints", False, f"Create failed: {response.status_code}")
                return False
            
            # Get status checks
            response = requests.get(f"{self.api_url}/status", timeout=10)
            get_success = response.status_code == 200
            
            if get_success:
                data = response.json()
                status_count = len(data) if isinstance(data, list) else 0
                details = f"Create & Get both successful, Status checks: {status_count}"
            else:
                details = f"Create successful, Get failed: {response.status_code}"
                get_success = False
            
            success = create_success and get_success
            self.log_test("Status Endpoints", success, details)
            return success
        except Exception as e:
            self.log_test("Status Endpoints", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all backend tests"""
        print("🚀 Starting Cartola Lab Studio Backend API Tests")
        print(f"📡 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Run tests in order
        tests = [
            self.test_api_root,
            self.test_create_session,
            self.test_get_session,
            self.test_chat_endpoint,
            self.test_create_task,
            self.test_get_tasks,
            self.test_status_endpoints
        ]
        
        for test in tests:
            test()
        
        # Summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"✨ Success Rate: {success_rate:.1f}%")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": len(self.failed_tests),
            "success_rate": success_rate,
            "failures": self.failed_tests
        }

def main():
    """Main test execution"""
    tester = CartolaStudioAPITester()
    results = tester.run_all_tests()
    
    # Exit with error code if tests failed
    return 0 if results["failed_tests"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())