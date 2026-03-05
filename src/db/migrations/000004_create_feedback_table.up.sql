-- Migration 4: Research feedback table

CREATE TABLE research_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating IN (-1, 1)),  -- -1 = thumbs down, 1 = thumbs up
  accuracy      SMALLINT CHECK (accuracy BETWEEN 1 AND 5),
  completeness  SMALLINT CHECK (completeness BETWEEN 1 AND 5),
  comment       TEXT,
  model_used    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_research_feedback_session ON research_feedback(session_id);
