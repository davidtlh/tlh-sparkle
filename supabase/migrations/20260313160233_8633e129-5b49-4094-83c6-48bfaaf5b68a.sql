
CREATE TABLE public.zoom_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.zoom_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on zoom_tokens" ON public.zoom_tokens
  FOR ALL USING (true) WITH CHECK (true);
