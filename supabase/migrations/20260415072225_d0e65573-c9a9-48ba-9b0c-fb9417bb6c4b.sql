
CREATE TABLE public.live_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  speaker TEXT,
  timestamp_ms BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_live_transcripts_meeting_id ON public.live_transcripts(meeting_id);

ALTER TABLE public.live_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read live transcripts"
ON public.live_transcripts
FOR SELECT
USING (true);

CREATE POLICY "Service role can insert live transcripts"
ON public.live_transcripts
FOR INSERT
WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_transcripts;
