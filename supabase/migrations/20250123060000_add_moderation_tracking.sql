-- Add moderation tracking table for AI chat moderation
-- This tracks warnings and violations for personal information sharing

-- Create moderation_warnings table
CREATE TABLE IF NOT EXISTS moderation_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  moderation_action TEXT NOT NULL CHECK (moderation_action IN ('WARN', 'STOP')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE moderation_warnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for moderation_warnings
-- Users can only view their own warnings
CREATE POLICY "Users can view their own moderation warnings" ON moderation_warnings
  FOR SELECT USING (auth.uid() = user_id);

-- Only system can insert warnings (via API with service role)
CREATE POLICY "System can insert moderation warnings" ON moderation_warnings
  FOR INSERT WITH CHECK (true);

-- No updates or deletes allowed (audit trail)
CREATE POLICY "No updates to moderation warnings" ON moderation_warnings
  FOR UPDATE USING (false);

CREATE POLICY "No deletes from moderation warnings" ON moderation_warnings
  FOR DELETE USING (false);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_moderation_warnings_user_id ON moderation_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_warnings_conversation_id ON moderation_warnings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_moderation_warnings_created_at ON moderation_warnings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_warnings_action ON moderation_warnings(moderation_action);

-- Create function to get user warning count
CREATE OR REPLACE FUNCTION get_user_warning_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM moderation_warnings
    WHERE user_id = user_uuid
    AND moderation_action = 'WARN'
    AND created_at > NOW() - INTERVAL '30 days'  -- Only count recent warnings
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_warning_count(UUID) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Moderation warnings table created successfully!';
  RAISE NOTICE 'Added moderation_warnings table with RLS policies';
  RAISE NOTICE 'Created get_user_warning_count function';
END $$;
