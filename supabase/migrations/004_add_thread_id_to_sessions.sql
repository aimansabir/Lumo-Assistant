-- Add thread_id column to chat_sessions table for AnythingLLM thread tracking
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS thread_id TEXT;

-- Create index for thread_id
CREATE INDEX IF NOT EXISTS chat_sessions_thread_id_idx ON chat_sessions(thread_id);

