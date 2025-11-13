-- Migration script to create sessions for existing messages
-- This creates a session for each unique (user_id, subject_id) combination
-- and links existing messages to those sessions

-- Create sessions for existing messages that don't have a session_id
INSERT INTO chat_sessions (user_id, subject_id, title, created_at, updated_at)
SELECT DISTINCT
  m.user_id,
  m.subject_id,
  COALESCE(
    (SELECT content FROM messages m2 
     WHERE m2.user_id = m.user_id 
     AND m2.subject_id = m.subject_id 
     AND m2.role = 'user' 
     ORDER BY m2.created_at ASC 
     LIMIT 1),
    'Chat Session'
  ) as title,
  MIN(m.created_at) as created_at,
  MAX(m.created_at) as updated_at
FROM messages m
WHERE m.session_id IS NULL
GROUP BY m.user_id, m.subject_id
ON CONFLICT DO NOTHING;

-- Update existing messages to link them to their sessions
UPDATE messages m
SET session_id = cs.id
FROM chat_sessions cs
WHERE m.user_id = cs.user_id
  AND m.subject_id = cs.subject_id
  AND m.session_id IS NULL;

