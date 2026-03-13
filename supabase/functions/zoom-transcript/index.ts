import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, downloadUrl } = await req.json();
    if (!sessionId || !downloadUrl) {
      return new Response(JSON.stringify({ error: "Missing sessionId or downloadUrl" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: tokenRow, error } = await supabase
      .from("zoom_tokens")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (error || !tokenRow) {
      return new Response(JSON.stringify({ error: "Not connected to Zoom" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh token if needed
    let accessToken = tokenRow.access_token;
    if (new Date(tokenRow.expires_at) <= new Date()) {
      const ZOOM_CLIENT_ID = Deno.env.get("ZOOM_CLIENT_ID")!;
      const ZOOM_CLIENT_SECRET = Deno.env.get("ZOOM_CLIENT_SECRET")!;

      const res = await fetch("https://zoom.us/oauth/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenRow.refresh_token,
        }),
      });

      if (!res.ok) throw new Error("Failed to refresh token");
      const tokens = await res.json();
      accessToken = tokens.access_token;

      await supabase.from("zoom_tokens").update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("session_id", tokenRow.session_id);
    }

    // Download transcript
    const transcriptUrl = `${downloadUrl}?access_token=${accessToken}`;
    const transcriptRes = await fetch(transcriptUrl);

    if (!transcriptRes.ok) {
      throw new Error("Failed to download transcript");
    }

    const transcript = await transcriptRes.text();

    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("zoom-transcript error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
