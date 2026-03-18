import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Video, Loader2, CheckCircle, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Recording {
  id: string;
  topic: string;
  startTime: string;
  duration: number;
  hasTranscript: boolean;
  recordingFiles: Array<{ file_type: string; download_url: string }>;
}

interface ZoomConnectProps {
  onTranscriptReady: (transcript: string, source: string) => void;
  isLoading: boolean;
}

function getSessionId() {
  let id = localStorage.getItem("zoom_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("zoom_session_id", id);
  }
  return id;
}

export function ZoomConnect({ onTranscriptReady, isLoading }: ZoomConnectProps) {
  const [connected, setConnected] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [fetchingTranscript, setFetchingTranscript] = useState<string | null>(null);

  const sessionId = getSessionId();

  async function handleDisconnect() {
    await supabase.from("zoom_tokens").delete().eq("session_id", sessionId);
    localStorage.removeItem("zoom_session_id");
    setConnected(false);
    setRecordings([]);
  }

  async function fetchRecordings() {
    setLoadingRecordings(true);
    try {
      const { data, error } = await supabase.functions.invoke("zoom-recordings", {
        body: { sessionId },
      });
      if (error) throw error;
      if (data?.error === "REAUTH_NEEDED") {
        toast.error("Zoom session expired. Please reconnect.");
        await handleDisconnect();
        return;
      }
      if (data?.error) throw new Error(data.error);
      setRecordings(data.recordings || []);
    } catch (err: any) {
      toast.error("Failed to load recordings");
      console.error(err);
    } finally {
      setLoadingRecordings(false);
    }
  }

  async function checkConnection() {
    const { data } = await supabase
      .from("zoom_tokens")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (data) {
      setConnected(true);
      fetchRecordings();
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("zoom") === "connected") {
      setConnected(true);
      window.history.replaceState({}, "", window.location.pathname);
      fetchRecordings();
    } else {
      checkConnection();
    }
  }, []);

  async function handleConnect() {
    try {
      const { data, error } = await supabase.functions.invoke("zoom-auth-url");
      if (error) throw error;
      const { clientId, redirectUri } = data;
      const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${sessionId}`;
      window.location.href = authUrl;
    } catch (err) {
      toast.error("Failed to start Zoom authorization");
      console.error(err);
    }
  }

  async function handleSelectRecording(recording: Recording) {
    const transcriptFile = recording.recordingFiles.find(
      (f) => f.file_type === "TRANSCRIPT"
    );

    if (!transcriptFile) {
      toast.error("No transcript available for this recording. Enable transcription in Zoom settings.");
      return;
    }

    setFetchingTranscript(recording.id);
    try {
      const { data, error } = await supabase.functions.invoke("zoom-transcript", {
        body: { sessionId, downloadUrl: transcriptFile.download_url },
      });
      if (error) throw error;
      onTranscriptReady(data.transcript, `Zoom: ${recording.topic}`);
    } catch (err: any) {
      toast.error("Failed to fetch transcript");
      console.error(err);
    } finally {
      setFetchingTranscript(null);
    }
  }

  if (!connected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <Video className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-display font-semibold text-foreground mb-2">
          Connect Your Zoom Account
        </h3>
        <p className="text-sm text-muted-foreground font-body mb-6 max-w-md mx-auto">
          Authorize access to your cloud recordings so we can automatically fetch
          lesson transcripts.
        </p>
        <Button variant="hero" size="lg" onClick={handleConnect}>
          <Video className="h-4 w-4 mr-2" />
          Connect Zoom
        </Button>
      </motion.div>
    );
  }

  function onDisconnectClick() {
    handleDisconnect();
    toast.success("Zoom disconnected. You can reconnect with updated permissions.");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
          <CheckCircle className="h-4 w-4 text-primary" />
          Zoom connected — select a recording to analyze
        </div>
        <Button variant="ghost" size="sm" onClick={onDisconnectClick} className="text-xs text-muted-foreground">
          Disconnect
        </Button>
      </div>

      {loadingRecordings ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground font-body">
            Loading recordings...
          </span>
        </div>
      ) : recordings.length === 0 ? (
        <p className="text-center text-muted-foreground font-body py-8">
          No cloud recordings found in the last 6 months.
        </p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {recordings.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelectRecording(r)}
              disabled={fetchingTranscript === r.id || isLoading}
              className="w-full text-left p-4 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-body font-medium text-foreground truncate">
                    {r.topic}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-body">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(r.startTime).toLocaleDateString()} —{" "}
                      {r.duration} min
                    </span>
                    {r.hasTranscript && (
                      <span className="flex items-center gap-1 text-primary">
                        <FileText className="h-3 w-3" />
                        Transcript
                      </span>
                    )}
                  </div>
                </div>
                {fetchingTranscript === r.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
