#!/usr/bin/env python3
"""
Test script for chat moderation service
Tests various message types to ensure proper classification
"""

import subprocess
import json
import sys
import os

def test_message(message, expected_action, description):
    """Test a single message and verify the result."""
    print(f"\n🧪 Testing: {description}")
    print(f"   Message: '{message}'")
    print(f"   Expected: {expected_action}")
    
    try:
        # Run the moderation script
        result = subprocess.run([
            sys.executable, 
            "python-services/chat_moderator.py", 
            message
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            print(f"   ❌ Error: {result.stderr}")
            return False
            
        # Parse the JSON response
        response = json.loads(result.stdout)
        actual_action = response.get("action", "UNKNOWN")
        reason = response.get("reason", "No reason provided")
        
        print(f"   Actual: {actual_action}")
        print(f"   Reason: {reason}")
        
        # Check if result matches expectation
        if actual_action == expected_action:
            print(f"   ✅ PASS")
            return True
        else:
            print(f"   ❌ FAIL - Expected {expected_action}, got {actual_action}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"   ❌ TIMEOUT - Script took too long")
        return False
    except json.JSONDecodeError:
        print(f"   ❌ JSON ERROR - Invalid response: {result.stdout}")
        return False
    except Exception as e:
        print(f"   ❌ ERROR - {str(e)}")
        return False

def main():
    """Run all moderation tests."""
    print("🤖 Chat Moderation Test Suite")
    print("=" * 50)
    
    # Check if API key is set
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ GOOGLE_API_KEY environment variable not set!")
        print("   Set it with: export GOOGLE_API_KEY='your_key_here'")
        sys.exit(1)
    
    # Test cases: (message, expected_action, description)
    test_cases = [
        # ALLOW cases
        ("Hello, how are you?", "ALLOW", "Normal greeting"),
        ("The meeting is at 3 PM", "ALLOW", "Time reference"),
        ("Let's meet at the coffee shop", "ALLOW", "General location"),
        ("Thanks for the help!", "ALLOW", "Polite message"),
        ("What's the price?", "ALLOW", "Business question"),
        
        # WARN cases
        ("Can I have your phone number?", "WARN", "Direct phone request"),
        ("What's your address?", "WARN", "Direct address request"),
        ("Where should I deliver the package?", "WARN", "Delivery address request"),
        ("Can you send me your email?", "WARN", "Email request"),
        ("What's your home address?", "WARN", "Home address request"),
        
        # STOP cases
        ("My phone number is 555-1234", "STOP", "Phone number sharing"),
        ("My address is 123 Main St", "STOP", "Address sharing"),
        ("I'm John Smith", "STOP", "Name sharing"),
        ("My email is john@example.com", "STOP", "Email sharing"),
        ("I live on Oak Street", "STOP", "Location sharing"),
    ]
    
    passed = 0
    total = len(test_cases)
    
    for message, expected_action, description in test_cases:
        if test_message(message, expected_action, description):
            passed += 1
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All tests passed! Moderation service is working correctly.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Check the moderation logic.")
        sys.exit(1)

if __name__ == "__main__":
    main()
