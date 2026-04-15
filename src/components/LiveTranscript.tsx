import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Radio, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface LiveTranscriptProps {
  onSubmit: (transcript: string, source: string) => void;
  isLoading: boolean;
}

interface TranscriptChunk {
  id: string;
  meeting_id: string;
  chunk_text: string;
  speaker: string | null;
  timestamp_ms: number | null;
  created_at: string;
}

export function LiveTranscript({ onSubmit, isLoading }: LiveTranscriptProps) {
  const [meetingId, setMeetingId] = useState("");
  const [listening, setListening] = useState(false);
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listening || !meetingId.trim()) return;

    // Fetch existing chunks for this meeting
    const fetchExisting = async () => {
      const { data } = await supabase
        .from("live_transcripts")
        .select("*")
        .eq("meeting_id", meetingId.trim())
        .order("created_at", { ascending: true });
      if (data) setChunks(data as TranscriptChunk[]);
    };
    fetchExisting();

    // Subscribe to new chunks
    const channel = supabase
      .channel(`live-transcript-${meetingId.trim()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_transcripts",
          filter: `meeting_id=eq.${meetingId.trim()}`,
        },
        (payload) => {
          setChunks((prev) => [...prev, payload.new as TranscriptChunk]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listening, meetingId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chunks]);

  const handleStart = () => {
    if (meetingId.trim()) setListening(true);
  };

  const handleStop = () => {
    setListening(false);
  };

  const handleAnalyze = () => {
    const fullTranscript = chunks
      .map((c) => (c.speaker ? `${c.speaker}: ${c.chunk_text}` : c.chunk_text))
      .join("\n");
    if (fullTranscript.trim()) {
      onSubmit(fullTranscript.trim(), "live");
    }
  };

  const handleClear = () => {
    setChunks([]);
    setListening(false);
    setMeetingId("");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter Zoom Meeting ID"
          value={meetingId}
          onChange={(e) => setMeetingId(e.target.value)}
          disabled={listening}
          className="font-body"
        />
        {!listening ? (
          <Button
            variant="hero"
            onClick={handleStart}
            disabled={!meetingId.trim()}
          >
            <Radio className="h-4 w-4" />
            Listen
          </Button>
        ) : (
          <Button variant="outline" onClick={handleStop}>
            Stop
          </Button>
        )}
      </div>

      {listening && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-primary font-body"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
          Listening for transcript on meeting {meetingId}...
        </motion.div>
      )}

      {chunks.length > 0 && (
        <>
          <div
            ref={scrollRef}
            className="bg-background border border-border rounded-lg p-4 max-h-[240px] overflow-y-auto space-y-2 font-body text-sm"
          >
            {chunks.map((chunk) => (
              <div key={chunk.id} className="text-foreground">
                {chunk.speaker && (
                  <span className="font-semibold text-primary">{chunk.speaker}: </span>
                )}
                <span>{chunk.chunk_text}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="hero"
              size="lg"
              className="flex-1"
              onClick={handleAnalyze}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing Lesson...
                </>
              ) : (
                `Analyze Now (${chunks.length} chunks)`
              )}
            </Button>
            <Button variant="outline" size="lg" onClick={handleClear}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
