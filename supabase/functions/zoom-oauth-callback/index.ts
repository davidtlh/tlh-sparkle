import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // session_id

  if (!code || !state) {
    return new Response("Missing code or state parameter", { status: 400 });
  }

  const ZOOM_CLIENT_ID = Deno.env.get("ZOOM_CLIENT_ID")!;
  const ZOOM_CLIENT_SECRET = Deno.env.get("ZOOM_CLIENT_SECRET")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const redirectUri = `${SUPABASE_URL}/functions/v1/zoom-oauth-callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Zoom token exchange failed:", err);
      return new Response(`Zoom auth failed: ${err}`, { status: 400 });
    }

    const tokens = await tokenRes.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error } = await supabase.from("zoom_tokens").upsert(
      {
        session_id: state,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    if (error) {
      console.error("Failed to store tokens:", error);
      return new Response("Failed to store tokens", { status: 500 });
    }

    // Redirect back to the app
    const appUrl = req.headers.get("origin") || "https://id-preview--0265d018-78ee-4b92-8f80-2ef0f89311d5.lovable.app";
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/?zoom=connected` },
    });
  } catch (e) {
    console.error("OAuth callback error:", e);
    return new Response("Internal error", { status: 500 });
  }
});
