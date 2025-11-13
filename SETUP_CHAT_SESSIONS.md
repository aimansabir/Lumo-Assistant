# Setup Chat Sessions - Troubleshooting Guide

## Issue: Chat sessions not showing after making a conversation

If you made a conversation in physics but don't see any chat sessions, follow these steps:

## Step 1: Run Database Migrations

You need to run the database migrations in Supabase:

### 1. Go to Supabase Dashboard
- Navigate to your Supabase project
- Go to **SQL Editor**

### 2. Run Migration 002 (Create chat_sessions table)
Copy and paste the contents of `supabase/migrations/002_create_chat_sessions_table.sql` and run it.

This will:
- Create the `chat_sessions` table
- Add `session_id` column to `messages` table
- Set up Row Level Security policies

### 3. Run Migration 003 (Migrate existing messages)
Copy and paste the contents of `supabase/migrations/003_migrate_existing_messages_to_sessions.sql` and run it.

This will:
- Create sessions for existing messages
- Link existing messages to their sessions

## Step 2: Check Browser Console

Open your browser's developer console (F12) and check for errors:

1. Look for messages starting with:
   - `📋 Loading chat sessions for subject:`
   - `📦 Sessions API response:`
   - `❌ Error` messages

2. Common errors:
   - **"relation 'chat_sessions' does not exist"** → Migration 002 not run
   - **"permission denied"** → RLS policies not set up correctly
   - **"Failed to fetch chat sessions"** → Check API endpoint

## Step 3: Verify Database Schema

In Supabase SQL Editor, run this query to check if tables exist:

```sql
-- Check if chat_sessions table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chat_sessions', 'messages');

-- Check if session_id column exists in messages
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name = 'session_id';

-- Check existing sessions
SELECT * FROM chat_sessions LIMIT 5;
```

## Step 4: Test API Endpoints

Test the sessions API directly:

1. Open browser console
2. Run this JavaScript:
```javascript
// Replace 'alphachat_physics' with your actual subject ID
fetch('/api/sessions?subjectId=alphachat_physics')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

## Common Issues and Solutions

### Issue: "chat_sessions table does not exist"
**Solution:** Run migration 002 in Supabase SQL Editor

### Issue: "No sessions found but messages exist"
**Solution:** Run migration 003 to create sessions for existing messages

### Issue: "Permission denied"
**Solution:** Check RLS policies are created correctly in migration 002

### Issue: Sessions created but not showing
**Solution:** 
1. Check browser console for errors
2. Verify subjectId matches exactly (case-sensitive)
3. Check if user is authenticated

## Verification Checklist

- [ ] Migration 002 has been run
- [ ] Migration 003 has been run (if you had existing messages)
- [ ] `chat_sessions` table exists
- [ ] `messages.session_id` column exists
- [ ] RLS policies are active
- [ ] Browser console shows no errors
- [ ] API endpoint returns sessions

## After Setup

Once migrations are run:
1. Refresh the page
2. Click the "+" button to create a new chat
3. Send a message - it should create a session automatically
4. Sessions should appear in the sidebar

## Need Help?

Check the browser console and server logs for detailed error messages. The code now includes extensive logging to help debug issues.

