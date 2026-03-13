import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function refreshTokenIfNeeded(supabase: any, tokenRow: any) {
  if (new Date(tokenRow.expires_at) > new Date()) {
    return tokenRow.access_token;
  }

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

  if (!res.ok) throw new Error("Failed to refresh Zoom token");

  const tokens = await res.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase.from("zoom_tokens").update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq("session_id", tokenRow.session_id);

  return tokens.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Missing sessionId" }), {
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

    const accessToken = await refreshTokenIfNeeded(supabase, tokenRow);

    // Get recordings from last 30 days
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const to = new Date().toISOString().split("T")[0];

    const zoomRes = await fetch(
      `https://api.zoom.us/v2/users/me/recordings?from=${from}&to=${to}&page_size=30`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!zoomRes.ok) {
      const err = await zoomRes.text();
      console.error("Zoom API error:", err);
      throw new Error("Failed to fetch recordings");
    }

    const data = await zoomRes.json();

    const recordings = (data.meetings || []).map((m: any) => ({
      id: m.uuid,
      topic: m.topic,
      startTime: m.start_time,
      duration: m.duration,
      hasTranscript: m.recording_files?.some((f: any) => f.file_type === "TRANSCRIPT") || false,
      recordingFiles: m.recording_files || [],
    }));

    return new Response(JSON.stringify({ recordings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("zoom-recordings error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
