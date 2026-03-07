-- draft_saved is stored as text in the status column, no schema change needed.
-- This migration documents the new valid chaser status value.

-- Ensure the match_client_memories function exists for pgvector RAG
CREATE OR REPLACE FUNCTION match_client_memories(
  query_embedding vector(1536),
  match_client_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  client_id uuid,
  content text,
  memory_type text,
  created_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cm.id,
    cm.client_id,
    cm.content,
    cm.memory_type,
    cm.created_at,
    1 - (cm.embedding <=> query_embedding) AS similarity
  FROM client_memories cm
  WHERE cm.client_id = match_client_id
    AND cm.embedding IS NOT NULL
  ORDER BY cm.embedding <=> query_embedding
  LIMIT match_count;
$$;
