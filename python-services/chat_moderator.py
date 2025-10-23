#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Chat Moderation Service
Converts the Colab notebook into a standalone script for AI-powered chat moderation.
"""

import sys
import json
import os
import argparse
from typing import Dict, Any

# Import LangChain components
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain.prompts import PromptTemplate
except ImportError as e:
    print(json.dumps({
        "error": f"Missing dependencies: {str(e)}",
        "action": "ALLOW",
        "reason": "Dependencies not installed"
    }))
    sys.exit(1)

def setup_gemini_api() -> ChatGoogleGenerativeAI:
    """Initialize Gemini API with error handling."""
    api_key = os.getenv("GOOGLE_API_KEY")
    
    if not api_key:
        return json.dumps({
            "error": "GOOGLE_API_KEY environment variable not set",
            "action": "ALLOW",
            "reason": "API key missing"
        })
    
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=0,
            max_tokens=None,
            timeout=30,  # 30 second timeout
            max_retries=2,
            google_api_key=api_key
        )
        return llm
    except Exception as e:
        return json.dumps({
            "error": f"Failed to initialize Gemini API: {str(e)}",
            "action": "ALLOW",
            "reason": "API initialization failed"
        })

def create_moderation_prompt() -> PromptTemplate:
    """Create the moderation prompt template."""
    moderation_prompt_template = """
You are a chatbot moderator identifying if a message contains personal information or a request for it.
If a message contains information like a name, phone number, address, or specific location, return "STOP".
If it contains a request asking for any personal information, including things like "Where should I deliver the package?" or "What's your address?", return "WARN".
Otherwise, return "ALLOW".

Message: "{message}"

Example Responses:
1. Message: "My address is 123 Maple St." -> STOP
2. Message: "Can I have your phone number?" -> WARN
3. Message: "Where should I deliver the package?" -> WARN
4. Message: "The meeting is at the office." -> ALLOW
5. Message: "What's your email?" -> WARN
6. Message: "My phone is 555-1234" -> STOP
7. Message: "I live on Main Street" -> STOP
8. Message: "Let's meet at the coffee shop" -> ALLOW
9. Message: "Can you send me your home address?" -> WARN
10. Message: "I'm John Smith" -> STOP

Respond with only: ALLOW, WARN, or STOP
"""

    return PromptTemplate(
        input_variables=["message"],
        template=moderation_prompt_template
    )

def moderate_message(message: str, llm: ChatGoogleGenerativeAI) -> Dict[str, Any]:
    """Moderate a single message using Gemini AI."""
    try:
        print(f"🔍 [PYTHON] Moderating message: {message[:50]}...", file=sys.stderr)
        
        # Create moderation prompt
        moderation_prompt = create_moderation_prompt()
        
        # Use the new LangChain syntax (prompt | llm)
        chain = moderation_prompt | llm
        print("🤖 [PYTHON] Calling Gemini API...", file=sys.stderr)
        result = chain.invoke({"message": message})
        
        print(f"🤖 [PYTHON] Raw Gemini response: {result}", file=sys.stderr)
        
        # Extract content from the response
        if hasattr(result, 'content'):
            action = result.content.strip().upper()
        else:
            action = str(result).strip().upper()
        
        print(f"🔍 [PYTHON] Extracted action: {action}", file=sys.stderr)
        
        # Validate response
        if action not in ["ALLOW", "WARN", "STOP"]:
            print(f"⚠️ [PYTHON] Invalid action '{action}', defaulting to ALLOW", file=sys.stderr)
            action = "ALLOW"  # Default to allow if response is invalid
        
        # Generate reason based on action
        if action == "STOP":
            reason = "Personal information detected in message"
        elif action == "WARN":
            reason = "Request for personal information detected"
        else:
            reason = "Message is appropriate"
        
        print(f"✅ [PYTHON] Final moderation result: {action} - {reason}", file=sys.stderr)
        
        return {
            "action": action,
            "reason": reason,
            "message_length": len(message)
        }
        
    except Exception as e:
        print(f"💥 [PYTHON] Error during moderation: {str(e)}", file=sys.stderr)
        # If moderation fails, allow the message but log the error
        return {
            "action": "ALLOW",
            "reason": f"Moderation failed: {str(e)}",
            "error": str(e)
        }

def main():
    """Main function to handle command line arguments and moderate messages."""
    print("🐍 [PYTHON] Starting chat moderator...", file=sys.stderr)
    
    parser = argparse.ArgumentParser(description="Moderate chat messages for personal information")
    parser.add_argument("message", help="The message to moderate")
    parser.add_argument("--user-id", help="User ID for logging (optional)")
    
    args = parser.parse_args()
    
    print(f"🐍 [PYTHON] Message to moderate: {args.message[:50]}...", file=sys.stderr)
    print(f"🐍 [PYTHON] User ID: {args.user_id}", file=sys.stderr)
    
    # Initialize Gemini API
    print("🤖 [PYTHON] Initializing Gemini API...", file=sys.stderr)
    llm_result = setup_gemini_api()
    if isinstance(llm_result, str):
        print(f"❌ [PYTHON] Gemini API setup failed: {llm_result}", file=sys.stderr)
        print(llm_result)
        sys.exit(1)
    
    print("✅ [PYTHON] Gemini API initialized successfully", file=sys.stderr)
    
    # Moderate the message
    print("🔍 [PYTHON] Running moderation...", file=sys.stderr)
    result = moderate_message(args.message, llm_result)
    
    # Add user_id if provided
    if args.user_id:
        result["user_id"] = args.user_id
    
    print(f"✅ [PYTHON] Moderation complete: {result['action']}", file=sys.stderr)
    
    # Output JSON result
    print(json.dumps(result))

if __name__ == "__main__":
    main()
