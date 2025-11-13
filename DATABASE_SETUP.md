# Database Setup Instructions

## Step 1: Create the Messages Table in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/001_create_messages_table.sql`
4. Click **Run** to execute the migration

Alternatively, you can run the SQL directly:

```sql
-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS messages_user_subject_idx ON messages(user_id, subject_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own messages
CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own messages
CREATE POLICY "Users can insert their own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own messages
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON messages FOR DELETE
  USING (auth.uid() = user_id);
```

## Step 2: Verify the Setup

After running the migration, verify that:
- The `messages` table exists
- Row Level Security (RLS) is enabled
- The policies are created correctly

## Features Enabled

After setup, the following features will work:

1. **Message History**: All chat messages are saved to the database
2. **Dashboard Stats**: Real-time message counts and last message times
3. **Persistent Chat**: Chat history is loaded when you return to a subject
4. **User Isolation**: Each user only sees their own messages (via RLS)

## Troubleshooting

If you encounter issues:

1. **"relation messages does not exist"**: Make sure you ran the migration
2. **"permission denied"**: Check that RLS policies are created correctly
3. **Messages not saving**: Check browser console and server logs for errors

