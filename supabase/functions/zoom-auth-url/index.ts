import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ZOOM_CLIENT_ID = Deno.env.get("ZOOM_CLIENT_ID")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const redirectUri = `${SUPABASE_URL}/functions/v1/zoom-oauth-callback`;

  return new Response(JSON.stringify({ clientId: ZOOM_CLIENT_ID, redirectUri }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
