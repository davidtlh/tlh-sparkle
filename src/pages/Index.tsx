import { useState } from "react";
import { motion } from "framer-motion";
import tlhLogo from "@/assets/TLH.png";
import { TranscriptInput } from "@/components/TranscriptInput";
import { ZoomConnect } from "@/components/ZoomConnect";
import { LessonSummary, type LessonAnalysis } from "@/components/LessonSummary";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const [analysis, setAnalysis] = useState<LessonAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (transcript: string, source: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-lesson", {
        body: { transcript },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAnalysis(data.analysis);
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast.error(err.message || "Failed to analyze the lesson. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        {!analysis ? (
          <>
            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-10"
            >
              <img src={tlhLogo} alt="The Language House" className="h-16 mb-6" />
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-3">
                EFL Lesson Analyzer
              </h1>
              <p className="text-lg text-muted-foreground font-body max-w-lg mx-auto">
                Paste your Zoom lesson transcript or connect your Zoom account to
                automatically fetch recordings.
              </p>
            </motion.div>

            <TranscriptInput onSubmit={handleSubmit} isLoading={isLoading} />
          </>
        ) : (
          <LessonSummary analysis={analysis} onBack={() => setAnalysis(null)} />
        )}
      </div>
    </div>
  );
};

export default Index;
