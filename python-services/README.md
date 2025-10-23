# Chat Moderation Python Service

This directory contains the Python service for AI-powered chat moderation using Google Gemini API.

## Setup

1. **Install Python dependencies:**

   ```bash
   cd python-services
   pip install -r requirements.txt
   ```

2. **Set up environment variable:**

   ```bash
   export GOOGLE_API_KEY="your_gemini_api_key_here"
   ```

   Or add to your `.env.local` file:

   ```
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```

3. **Get Gemini API Key:**
   - Go to https://aistudio.google.com/apikey
   - Create a new API key
   - Copy and set as `GOOGLE_API_KEY`

## Usage

### Command Line Testing

```bash
python chat_moderator.py "My phone number is 555-1234"
# Output: {"action": "STOP", "reason": "Personal information detected in message"}

python chat_moderator.py "Can I have your address?"
# Output: {"action": "WARN", "reason": "Request for personal information detected"}

python chat_moderator.py "Hello, how are you?"
# Output: {"action": "ALLOW", "reason": "Message is appropriate"}
```

### Integration with Next.js

The service is called from Next.js API routes via subprocess:

```typescript
const { spawn } = require("child_process");
const python = spawn("python", ["python-services/chat_moderator.py", message]);
```

## API Response Format

```json
{
  "action": "ALLOW|WARN|STOP",
  "reason": "Human readable explanation",
  "message_length": 25,
  "user_id": "optional-user-id"
}
```

## Error Handling

- If dependencies are missing: Returns `ALLOW` with error message
- If API key is missing: Returns `ALLOW` with error message
- If Gemini API fails: Returns `ALLOW` with error message
- If response is invalid: Defaults to `ALLOW`

## Testing

Test various message types:

```bash
# Should be ALLOW
python chat_moderator.py "Hello there!"

# Should be WARN
python chat_moderator.py "What's your phone number?"

# Should be STOP
python chat_moderator.py "My address is 123 Main St"
```

## Troubleshooting

1. **ImportError**: Run `pip install -r requirements.txt`
2. **API Key Error**: Check `GOOGLE_API_KEY` environment variable
3. **Timeout**: Gemini API has 30-second timeout, increase if needed
4. **Rate Limits**: Monitor Gemini API usage in Google Cloud Console
