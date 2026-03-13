
DROP POLICY "Allow all operations on zoom_tokens" ON public.zoom_tokens;

CREATE POLICY "Allow select on zoom_tokens" ON public.zoom_tokens
  FOR SELECT USING (true);
