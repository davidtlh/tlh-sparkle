import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, BookOpen, ArrowLeft, MessageCircle, Lightbulb, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillsRadarChart, type SkillsProfile } from "@/components/SkillsRadarChart";

export interface LessonAnalysis {
  overallLevel: string;
  lessonTopic: string;
  grammarMistakes: { mistake: string; correction: string; explanation: string }[];
  vocabularyIssues: { issue: string; suggestion: string }[];
  pronunciationNotes: string[];
  teacherRecommendations: string[];
  strengths: string[];
  practiceQuestions: { question: string; answer: string }[];
  skillsProfile: SkillsProfile;
}

interface LessonSummaryProps {
  analysis: LessonAnalysis;
  onBack: () => void;
}

const stagger = {
  container: { transition: { staggerChildren: 0.08 } },
  item: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  },
};

function PracticeQuestions({ questions }: { questions: { question: string; answer: string }[] }) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const revealAll = () =>
    setRevealed(new Set(questions.map((_, i) => i)));

  const hideAll = () => setRevealed(new Set());

  return (
    <motion.div variants={stagger.item} className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-display font-semibold text-foreground">📝 Practice Questions</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={revealed.size === questions.length ? hideAll : revealAll}
          className="text-muted-foreground text-xs"
        >
          {revealed.size === questions.length ? (
            <><EyeOff className="h-3.5 w-3.5 mr-1" /> Hide All</>
          ) : (
            <><Eye className="h-3.5 w-3.5 mr-1" /> Show All Answers</>
          )}
        </Button>
      </div>
      <ol className="space-y-3">
        {questions.map((q, i) => (
          <li key={i} className="font-body">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground font-medium min-w-[1.5rem]">{i + 1}.</span>
              <div className="flex-1">
                <p className="text-foreground">{q.question}</p>
                <button
                  onClick={() => toggle(i)}
                  className="mt-1 text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  {revealed.has(i) ? (
                    <><EyeOff className="h-3 w-3" /> Hide answer</>
                  ) : (
                    <><Eye className="h-3 w-3" /> Show answer</>
                  )}
                </button>
                {revealed.has(i) && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-1 text-sm text-accent font-medium"
                  >
                    ✓ {q.answer}
                  </motion.p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}

export function LessonSummary({ analysis, onBack }: LessonSummaryProps) {
  return (
    <motion.div
      className="w-full max-w-3xl mx-auto space-y-6 pb-12"
      initial="initial"
      animate="animate"
      variants={stagger.container}
    >
      {/* Header */}
      <motion.div variants={stagger.item} className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> New Analysis
          </Button>
          <h2 className="text-3xl font-display font-bold text-foreground">Lesson Summary</h2>
          <p className="text-muted-foreground font-body mt-1">
            {analysis.lessonTopic} · Level: {analysis.overallLevel}
          </p>
        </div>
      </motion.div>

      {/* Skills Radar Chart */}
      {analysis.skillsProfile && (
        <motion.div variants={stagger.item} className="bg-card border border-border rounded-lg p-5">
          <SkillsRadarChart skills={analysis.skillsProfile} />
        </motion.div>
      )}

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <motion.div variants={stagger.item} className="bg-accent/10 border border-accent/20 rounded-lg p-5">
          <h3 className="flex items-center gap-2 text-lg font-display font-semibold text-accent mb-3">
            <CheckCircle2 className="h-5 w-5" /> What You Did Well
          </h3>
          <ul className="space-y-2">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="text-foreground font-body flex items-start gap-2">
                <span className="text-accent mt-1">•</span> {s}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Grammar Mistakes */}
      {analysis.grammarMistakes.length > 0 && (
        <motion.div variants={stagger.item} className="bg-destructive/5 border border-destructive/15 rounded-lg p-5">
          <h3 className="flex items-center gap-2 text-lg font-display font-semibold text-destructive mb-3">
            <AlertTriangle className="h-5 w-5" /> Grammar Corrections
          </h3>
          <div className="space-y-4">
            {analysis.grammarMistakes.map((m, i) => (
              <div key={i} className="bg-background/60 rounded-md p-3 space-y-1">
                <div className="font-body">
                  <span className="line-through text-destructive/70">{m.mistake}</span>
                  {" → "}
                  <span className="font-semibold text-accent">{m.correction}</span>
                </div>
                <p className="text-sm text-muted-foreground font-body">{m.explanation}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Vocabulary */}
      {analysis.vocabularyIssues.length > 0 && (
        <motion.div variants={stagger.item} className="bg-warning/5 border border-warning/15 rounded-lg p-5">
          <h3 className="flex items-center gap-2 text-lg font-display font-semibold text-warning mb-3">
            <BookOpen className="h-5 w-5" /> Vocabulary to Improve
          </h3>
          <div className="space-y-3">
            {analysis.vocabularyIssues.map((v, i) => (
              <div key={i} className="font-body">
                <span className="text-foreground font-medium">{v.issue}</span>
                <span className="text-muted-foreground"> — {v.suggestion}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pronunciation */}
      {analysis.pronunciationNotes.length > 0 && (
        <motion.div variants={stagger.item} className="bg-secondary border border-border rounded-lg p-5">
          <h3 className="flex items-center gap-2 text-lg font-display font-semibold text-foreground mb-3">
            <MessageCircle className="h-5 w-5" /> Pronunciation Notes
          </h3>
          <ul className="space-y-2">
            {analysis.pronunciationNotes.map((n, i) => (
              <li key={i} className="text-foreground font-body flex items-start gap-2">
                <span className="text-primary mt-1">•</span> {n}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Teacher Recommendations */}
      {analysis.teacherRecommendations.length > 0 && (
        <motion.div variants={stagger.item} className="bg-primary/5 border border-primary/15 rounded-lg p-5">
          <h3 className="flex items-center gap-2 text-lg font-display font-semibold text-primary mb-3">
            <Lightbulb className="h-5 w-5" /> Teacher's Recommendations
          </h3>
          <ul className="space-y-2">
            {analysis.teacherRecommendations.map((r, i) => (
              <li key={i} className="text-foreground font-body flex items-start gap-2">
                <span className="text-primary mt-1">{i + 1}.</span> {r}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Practice Questions */}
      {analysis.practiceQuestions?.length > 0 && (
        <PracticeQuestions questions={analysis.practiceQuestions} />
      )}
    </motion.div>
  );
}
