import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Upload, Video, Loader2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ZoomConnect } from "@/components/ZoomConnect";
import { LiveTranscript } from "@/components/LiveTranscript";

interface TranscriptInputProps {
  onSubmit: (transcript: string, source: string) => void;
  isLoading: boolean;
}

export function TranscriptInput({ onSubmit, isLoading }: TranscriptInputProps) {
  const [transcript, setTranscript] = useState("");

  const handlePasteSubmit = () => {
    if (transcript.trim()) {
      onSubmit(transcript.trim(), "paste");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setTranscript(text);
    };
    reader.readAsText(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full max-w-2xl mx-auto"
    >
      <Tabs defaultValue="zoom" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted">
          <TabsTrigger value="zoom" className="flex items-center gap-2 font-body">
            <Video className="h-4 w-4" />
            Zoom
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-2 font-body">
            <Radio className="h-4 w-4" />
            Live
          </TabsTrigger>
          <TabsTrigger value="paste" className="flex items-center gap-2 font-body">
            <FileText className="h-4 w-4" />
            Paste
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2 font-body">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="zoom" className="mt-4">
          <ZoomConnect onTranscriptReady={onSubmit} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="live" className="mt-4">
          <LiveTranscript onSubmit={onSubmit} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="paste" className="mt-4">
          <div className="space-y-4">
            <Textarea
              placeholder="Paste your Zoom transcript here... Include the full conversation between teacher and student."
              className="min-h-[240px] bg-background border-border font-body text-foreground placeholder:text-muted-foreground resize-y"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={handlePasteSubmit}
              disabled={!transcript.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing Lesson...
                </>
              ) : (
                "Analyze My Lesson"
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-background">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground font-body">
                Drop a .txt or .vtt transcript file here
              </span>
              <input
                type="file"
                className="hidden"
                accept=".txt,.vtt,.srt"
                onChange={handleFileUpload}
              />
            </label>
            {transcript && (
              <div className="text-sm text-muted-foreground font-body">
                ✓ File loaded ({transcript.length} characters)
              </div>
            )}
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={handlePasteSubmit}
              disabled={!transcript.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing Lesson...
                </>
              ) : (
                "Analyze My Lesson"
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
