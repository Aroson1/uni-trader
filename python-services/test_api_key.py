#!/usr/bin/env python3
"""
Simple script to test if a Google Gemini API key is valid
"""

import os
import sys
import json

def test_api_key(api_key):
    """Test if the API key is valid by making a simple request"""
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        
        print(f"🔑 Testing API key: {api_key[:10]}...")
        
        # Try different model names
        models_to_try = [
            "gemini-pro",
            "gemini-1.5-pro", 
            "gemini-1.5-flash",
            "gemini-pro-vision"
        ]
        
        for model in models_to_try:
            try:
                print(f"🤖 Trying model: {model}")
                llm = ChatGoogleGenerativeAI(
                    model=model,
                    temperature=0,
                    google_api_key=api_key
                )
                
                # Make a simple test request
                result = llm.invoke("Say 'Hello'")
                print(f"✅ Model {model} works! Response: {result}")
                return model
                
            except Exception as e:
                print(f"❌ Model {model} failed: {str(e)[:100]}...")
                continue
        
        print("❌ No models worked with this API key")
        return None
        
    except ImportError:
        print("❌ langchain_google_genai not installed. Run: pip install langchain-google-genai")
        return None
    except Exception as e:
        print(f"❌ Error testing API key: {str(e)}")
        return None

if __name__ == "__main__":
    api_key = os.environ.get("GOOGLE_API_KEY")
    
    if not api_key:
        print("❌ GOOGLE_API_KEY environment variable not set")
        print("Usage: GOOGLE_API_KEY=your_key python test_api_key.py")
        sys.exit(1)
    
    working_model = test_api_key(api_key)
    
    if working_model:
        print(f"\n✅ SUCCESS! Use model: {working_model}")
        print(f"Update your chat_moderator.py to use: model='{working_model}'")
    else:
        print("\n❌ FAILED! Your API key is invalid or has no access to Gemini models")
        print("Get a new API key from: https://aistudio.google.com/apikey")
