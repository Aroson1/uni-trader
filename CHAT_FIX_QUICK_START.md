# 🚀 Quick Start - Fix Chat Real-Time

## The Issue

Error: `Could not find the 'last_message_at' column of 'conversations'`

## The Fix (2 Steps)

### Step 1: Fix Database Schema

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Copy from: supabase/migrations/20250123010000_fix_conversations_schema.sql
```

### Step 2: Enable Real-Time

In the same SQL Editor, run:

```sql
-- Copy from: supabase/migrations/20250123000000_enable_realtime_final.sql
```

## Done! ✅

Your chat will now:

- ✅ Create conversations without errors
- ✅ Send messages in real-time
- ✅ No refresh needed to see new messages
- ✅ "Chat with Seller" button works perfectly

## Test It

1. Open two browsers (or normal + incognito)
2. Log in as different users
3. Click "Chat with Seller" on an NFT
4. Send messages - they appear instantly! 🎉

---

**Note:** The V1 chat was already perfect. We just needed to fix the database schema and enable real-time. That's it!
