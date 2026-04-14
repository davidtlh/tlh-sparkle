

## Plan: Live Transcript via Zoom Webhooks

### How It Works

Zoom fires `meeting.transcript_completed` and related webhook events during a call. We'll create an edge function to receive these events, store transcript chunks in a new database table, and add a "Live Lesson" tab in the UI that accumulates and displays the transcript in real time — with an "Analyze Now" button to trigger analysis at any point during or after the call.

### Requirements

Before implementation, you'll need to configure a **Webhook-only app** or add a webhook subscription to your existing Zoom OAuth app in the [Zoom Marketplace](https://marketplace.zoom.us/):
- **Event subscription URL**: `https://rkjcjwswmwyaaozmwcqw.supabase.co/functions/v1/zoom-webhook`
- **Event types to subscribe**: `meeting.live_transcription_ready` (or the specific transcript events your Pro plan supports)
- **Verification token / Secret token**: Zoom will provide a secret token for webhook validation — we'll need to store it as a secret

### Database Changes

**New table: `live_transcripts`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| meeting_id | text | Zoom meeting ID |
| chunk_text | text | Transcript chunk content |
| speaker | text | Speaker name (nullable) |
| timestamp_ms | bigint | Timestamp within meeting |
| created_at | timestamptz | Default now() |

Enable realtime on this table so the frontend can subscribe to new chunks as they arrive.

RLS: Public read access (no auth in this app currently).

### New Edge Function: `zoom-webhook`

- Receives POST requests from Zoom
- Validates the webhook using Zoom's secret token header
- Handles Zoom's URL validation challenge (CRC check)
- Parses `meeting.live_transcription_ready` events
- Inserts transcript chunks into `live_transcripts` table

### Frontend Changes

**New component: `LiveTranscript.tsx`**
- Subscribes to `live_transcripts` table via Supabase Realtime, filtered by meeting ID
- Shows transcript chunks accumulating in real time
- Includes an "Analyze Now" button that concatenates all chunks and sends to `analyze-lesson`

**Updated `TranscriptInput.tsx`**
- Add a 4th tab: "Live" with a radio/activity icon
- Renders the `LiveTranscript` component
- User enters their Zoom meeting ID to start listening

### Secret Needed

- `ZOOM_WEBHOOK_SECRET_TOKEN` — the secret token from Zoom's webhook configuration, used to validate incoming webhook requests

### Steps

1. Add `ZOOM_WEBHOOK_SECRET_TOKEN` secret
2. Create `live_transcripts` table with realtime enabled
3. Create `zoom-webhook` edge function with CRC validation and chunk storage
4. Build `LiveTranscript` component with realtime subscription
5. Add "Live" tab to `TranscriptInput`

### Technical Note

The exact webhook event names depend on your Zoom app type and plan. Once you configure the webhook in Zoom Marketplace, we can adjust the event handling to match. The most common events are `meeting.live_transcription_ready` and `meeting.transcript_completed`.

