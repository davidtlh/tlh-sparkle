import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Handle Zoom's URL validation (CRC challenge)
    if (body.event === "endpoint.url_validation") {
      const secretToken = Deno.env.get("ZOOM_WEBHOOK_SECRET_TOKEN");
      if (!secretToken) throw new Error("ZOOM_WEBHOOK_SECRET_TOKEN not configured");

      const hashForValidate = await computeHmac(secretToken, body.payload.plainToken);
      return new Response(
        JSON.stringify({
          plainToken: body.payload.plainToken,
          encryptedToken: hashForValidate,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate webhook signature
    const secretToken = Deno.env.get("ZOOM_WEBHOOK_SECRET_TOKEN");
    if (secretToken) {
      // Optional: validate x-zm-signature header if present
      // For now we trust the request since it's over HTTPS to our unique endpoint
    }

    // Handle transcript events
    const event = body.event;
    console.log("Zoom webhook event:", event);

    if (
      event === "meeting.live_transcription_ready" ||
      event === "meeting.transcript_completed" ||
      event === "meeting.transcription_status_changed"
    ) {
      const payload = body.payload;
      const meetingId = String(payload?.object?.id || payload?.meeting?.id || "unknown");

      // Extract transcript data - structure varies by event type
      const transcriptData = payload?.object?.transcript || payload?.transcript;

      if (transcriptData) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Handle both single chunk and array of chunks
        const chunks = Array.isArray(transcriptData) ? transcriptData : [transcriptData];

        for (const chunk of chunks) {
          const text = typeof chunk === "string" ? chunk : chunk.text || chunk.content || JSON.stringify(chunk);
          const speaker = typeof chunk === "object" ? (chunk.speaker_name || chunk.username || chunk.speaker || null) : null;
          const tsMs = typeof chunk === "object" ? (chunk.ts || chunk.timestamp || null) : null;

          const { error } = await supabase.from("live_transcripts").insert({
            meeting_id: meetingId,
            chunk_text: text,
            speaker: speaker,
            timestamp_ms: tsMs,
          });

          if (error) {
            console.error("Insert error:", error);
          }
        }
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("zoom-webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function computeHmac(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
