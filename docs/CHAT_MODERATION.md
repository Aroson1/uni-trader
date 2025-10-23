# AI Chat Moderation System

This document explains the AI-powered chat moderation system that prevents personal information sharing in chat messages.

## Overview

The moderation system uses Google's Gemini AI to analyze chat messages and detect:

- **Personal information sharing** (names, addresses, phone numbers, emails)
- **Requests for personal information** (asking for addresses, phone numbers, etc.)

## How It Works

1. **User sends a message** → Frontend calls `/api/chat/moderate`
2. **API spawns Python process** → Runs `chat_moderator.py` with the message
3. **Gemini AI analyzes message** → Returns ALLOW, WARN, or STOP
4. **System blocks flagged messages** → WARN and STOP messages are blocked
5. **Warning tracking** → WARN messages count toward 3-strike ban
6. **User banning** → After 3 warnings, user is banned from platform

## Message Classification

### ALLOW (✅)

Messages that are appropriate and don't contain personal information:

- "Hello, how are you?"
- "The meeting is at 3 PM"
- "Let's meet at the coffee shop"
- "What's the price?"

### WARN (⚠️) - BLOCKED

Messages requesting personal information (blocked, counts as warning):

- "Can I have your phone number?"
- "What's your address?"
- "Where should I deliver the package?"
- "Can you send me your email?"

### STOP (🚫) - BLOCKED

Messages containing personal information (blocked immediately):

- "My phone number is 555-1234"
- "My address is 123 Main St"
- "I'm John Smith"
- "My email is john@example.com"

## User Banning System

### Warning System

- **WARN messages**: Blocked + 1 warning added to user's count
- **STOP messages**: Blocked + logged as violation (no warning count)
- **Warning reset**: Warnings reset after 30 days

### Banning Process

- **3 warnings**: User is automatically banned from platform
- **Ban effect**: User cannot access chat, send messages, or use platform features
- **Ban reason**: Stored in database for admin review
- **User experience**: Redirected to home page with ban message

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd python-services
pip install -r requirements.txt
```

### 2. Get Gemini API Key

1. Go to https://aistudio.google.com/apikey
2. Create a new API key
3. Copy the key

### 3. Configure Environment Variables

Create `.env.local` file:

```bash
# Copy from env.template
cp env.template .env.local
```

Edit `.env.local`:

```bash
GOOGLE_API_KEY=your_gemini_api_key_here
PYTHON_PATH=python
DISABLE_MODERATION=false
```

### 4. Run Database Migration

In Supabase SQL Editor, run:

```sql
-- Copy from: supabase/migrations/20250123060000_add_moderation_tracking.sql
```

## Testing

### Test Python Service

```bash
cd python-services
python test_moderation.py
```

### Test Individual Messages

```bash
# Should be ALLOW
python chat_moderator.py "Hello there!"

# Should be WARN
python chat_moderator.py "What's your phone number?"

# Should be STOP
python chat_moderator.py "My address is 123 Main St"
```

### Test in Chat

1. **Normal message**: Should work fine
2. **Phone number**: Should be blocked
3. **Address request**: Should show warning (1/3)
4. **3 warnings**: Should be blocked

## Configuration

### Environment Variables

| Variable             | Description        | Default  |
| -------------------- | ------------------ | -------- |
| `GOOGLE_API_KEY`     | Gemini API key     | Required |
| `PYTHON_PATH`        | Python executable  | `python` |
| `DISABLE_MODERATION` | Disable moderation | `false`  |

### Disable Moderation

To temporarily disable moderation:

```bash
# In .env.local
DISABLE_MODERATION=true
```

This allows all messages without AI analysis.

## Database Schema

### moderation_warnings Table

| Column              | Type      | Description               |
| ------------------- | --------- | ------------------------- |
| `id`                | UUID      | Primary key               |
| `user_id`           | UUID      | User who sent the message |
| `conversation_id`   | UUID      | Conversation context      |
| `message_content`   | TEXT      | The flagged message       |
| `moderation_action` | TEXT      | WARN or STOP              |
| `reason`            | TEXT      | AI explanation            |
| `created_at`        | TIMESTAMP | When flagged              |

### Warning Count Function

```sql
SELECT get_user_warning_count('user-uuid-here');
```

Returns count of WARN actions in last 30 days.

## Privacy Considerations

- **Only flagged messages are stored** - Normal messages are not logged
- **RLS policies protect data** - Users can only see their own warnings
- **Admin access required** - Only admins can view all moderation logs
- **30-day retention** - Warning counts reset after 30 days

## Troubleshooting

### Common Issues

1. **"Moderation service unavailable"**

   - Check if Python dependencies are installed
   - Verify `GOOGLE_API_KEY` is set
   - Check Python path in `PYTHON_PATH`

2. **"ImportError: Missing dependencies"**

   ```bash
   cd python-services
   pip install -r requirements.txt
   ```

3. **"API key missing"**

   - Get key from https://aistudio.google.com/apikey
   - Add to `.env.local` as `GOOGLE_API_KEY`

4. **"Moderation timeout"**

   - Gemini API has 30-second timeout
   - Check internet connection
   - Monitor API usage limits

5. **All messages blocked**
   - Check if `DISABLE_MODERATION=true`
   - Verify API key is valid
   - Check Python service logs

### Debug Mode

Enable debug logging:

```bash
# In .env.local
NODE_ENV=development
```

Check browser console and server logs for detailed error messages.

### Performance

- **First message**: ~2-3 seconds (cold start)
- **Subsequent messages**: ~1-2 seconds
- **Timeout**: 10 seconds maximum
- **Fallback**: Allow message if moderation fails

## Monitoring

### Check Warning Counts

```sql
-- Users with warnings
SELECT
  p.name,
  p.email,
  COUNT(mw.id) as warning_count
FROM profiles p
JOIN moderation_warnings mw ON p.id = mw.user_id
WHERE mw.created_at > NOW() - INTERVAL '30 days'
GROUP BY p.id, p.name, p.email
ORDER BY warning_count DESC;
```

### Recent Violations

```sql
-- Recent moderation actions
SELECT
  p.name,
  mw.message_content,
  mw.moderation_action,
  mw.reason,
  mw.created_at
FROM moderation_warnings mw
JOIN profiles p ON mw.user_id = p.id
ORDER BY mw.created_at DESC
LIMIT 20;
```

## API Reference

### POST /api/chat/moderate

**Request:**

```json
{
  "message": "Can I have your phone number?",
  "conversation_id": "uuid"
}
```

**Response:**

```json
{
  "allowed": true,
  "action": "WARN",
  "warnings": 1,
  "reason": "Request for personal information detected"
}
```

**Error Response:**

```json
{
  "allowed": true,
  "action": "ALLOW",
  "warnings": 0,
  "reason": "Moderation service unavailable",
  "error": "Python process failed"
}
```

## Security Notes

- **Fail-open design**: If moderation fails, messages are allowed
- **No message content stored**: Only flagged messages are logged
- **Rate limiting**: Gemini API has usage limits
- **Audit trail**: All moderation actions are logged
- **User privacy**: RLS prevents cross-user data access

## Future Enhancements

- **Caching**: Cache results for identical messages
- **Custom rules**: Allow custom moderation rules per user
- **Admin dashboard**: Web interface for moderation management
- **Analytics**: Detailed moderation statistics
- **Multi-language**: Support for non-English messages
