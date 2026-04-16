import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, BookOpen, ArrowLeft, MessageCircle, Lightbulb, Eye, EyeOff, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SkillsRadarChart, type SkillsProfile } from "@/components/SkillsRadarChart";
import { toast } from "sonner";

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

/* ── Practice Questions (view mode) ── */
function PracticeQuestions({ questions }: { questions: { question: string; answer: string }[] }) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  const revealAll = () => setRevealed(new Set(questions.map((_, i) => i)));
  const hideAll = () => setRevealed(new Set());

  return (
    <motion.div variants={stagger.item} className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-display font-semibold text-foreground">📝 Practice Questions</h3>
        <Button variant="ghost" size="sm" onClick={revealed.size === questions.length ? hideAll : revealAll} className="text-muted-foreground text-xs">
          {revealed.size === questions.length ? <><EyeOff className="h-3.5 w-3.5 mr-1" /> Hide All</> : <><Eye className="h-3.5 w-3.5 mr-1" /> Show All Answers</>}
        </Button>
      </div>
      <ol className="space-y-3">
        {questions.map((q, i) => (
          <li key={i} className="font-body">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground font-medium min-w-[1.5rem]">{i + 1}.</span>
              <div className="flex-1">
                <p className="text-foreground">{q.question}</p>
                <button onClick={() => toggle(i)} className="mt-1 text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                  {revealed.has(i) ? <><EyeOff className="h-3 w-3" /> Hide answer</> : <><Eye className="h-3 w-3" /> Show answer</>}
                </button>
                {revealed.has(i) && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-1 text-sm text-accent font-medium">
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

/* ── Editable list helpers ── */
function EditableStringList({ items, onChange, label }: { items: string[]; onChange: (items: string[]) => void; label: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={item}
            onChange={(e) => { const next = [...items]; next[i] = e.target.value; onChange(next); }}
            className="flex-1"
          />
          <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-destructive shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, ""])}>+ Add {label}</Button>
    </div>
  );
}

/* ── Main component ── */
export function LessonSummary({ analysis, onBack }: LessonSummaryProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LessonAnalysis>(structuredClone(analysis));

  const startEdit = () => { setDraft(structuredClone(analysis)); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  // We store edits in draft; parent receives updated analysis
  const [currentAnalysis, setCurrentAnalysis] = useState(analysis);

  const saveEdit = () => {
    setCurrentAnalysis(draft);
    setEditing(false);
    toast.success("Changes saved");
  };

  const a = editing ? draft : currentAnalysis;
  const update = <K extends keyof LessonAnalysis>(key: K, value: LessonAnalysis[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <motion.div className="w-full max-w-3xl mx-auto space-y-6 pb-12" initial="initial" animate="animate" variants={stagger.container}>
      {/* Header */}
      <motion.div variants={stagger.item} className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> New Analysis
          </Button>
          {editing ? (
            <div className="space-y-2">
              <Input value={draft.lessonTopic} onChange={(e) => update("lessonTopic", e.target.value)} className="text-lg font-display font-bold" placeholder="Lesson topic" />
              <Input value={draft.overallLevel} onChange={(e) => update("overallLevel", e.target.value)} className="w-32" placeholder="Level" />
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-display font-bold text-foreground">Lesson Summary</h2>
              <p className="text-muted-foreground font-body mt-1">{a.lessonTopic} · Level: {a.overallLevel}</p>
            </>
          )}
        </div>
        <div className="flex gap-2 mt-1">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={cancelEdit}><X className="h-4 w-4 mr-1" /> Cancel</Button>
              <Button variant="hero" size="sm" onClick={saveEdit}><Save className="h-4 w-4 mr-1" /> Save</Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
          )}
        </div>
      </motion.div>

      {/* Skills Radar Chart */}
      {a.skillsProfile && (
        <motion.div variants={stagger.item} className="bg-card border border-border rounded-lg p-5">
          <SkillsRadarChart skills={a.skillsProfile} />
          {editing && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              {(Object.keys(a.skillsProfile) as (keyof SkillsProfile)[]).map((key) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</label>
                  <Input
                    type="number" min={1} max={10}
                    value={draft.skillsProfile[key]}
                    onChange={(e) => update("skillsProfile", { ...draft.skillsProfile, [key]: Number(e.target.value) })}
                  />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Strengths */}
      {(a.strengths.length > 0 || editing) && (
        <motion.div variants={stagger.item} className="bg-accent/10 border border-accent/20 rounded-lg p-5">
          <h3 className="flex items-center gap-2 text-lg font-display font-semibold text-accent mb-3">
            <CheckCircle2 className="h-5 w-5" /> What You Did Well
          </h3>
          {editing ? (
            <EditableStringList items={draft.strengths} onChange={(v) => update("strengths", v)} label="strength" />
          ) : (
            <ul className="space-y-2">
              {a.strengths.map((s, i) => <li key={i} className="text-foreground font-body flex items-start gap-2"><span className="text-accent mt-1">•</span> {s}</li>)}
            </ul>
          )}
        </motion.div>
      )}

      {/* Grammar Mistakes */}
      {(a.grammarMistakes.length > 0 || editing) && (
        <motion.div variants={stagger.item} className="bg-destructive/5 border border-destructive/15 rounded-lg p-5">
          <h3 className="flex items-center gap-2 text-lg font-display font-semibold text-destructive mb-3">
            <AlertTriangle className="h-5 w-5" /> Grammar Corrections
          </h3>
          {editing ? (
            <div className="space-y-3">
              {draft.grammarMistakes.map((m, i) => (
                <div key={i} className="bg-background/60 rounded-md p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input value={m.mistake} onChange={(e) => { const next = [...draft.grammarMistakes]; next[i] = { ...m, mistake: e.target.value }; update("grammarMistakes", next); }} placeholder="Mistake" className="flex-1" />
                    <Input value={m.correction} onChange={(e) => { const next = [...draft.grammarMistakes]; next[i] = { ...m, correction: e.target.value }; update("grammarMistakes", next); }} placeholder="Correction" className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={() => update("grammarMistakes", draft.grammarMistakes.filter((_, j) => j !== i))} className="text-destructive shrink-0"><X className="h-4 w-4" /></Button>
                  </div>
                  <Input value={m.explanation} onChange={(e) => { const next = [...draft.grammarMistakes]; next[i] = { ...m, explanation: e.target.value }; update("grammarMistakes", next); }} placeholder="Explanation" />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update("grammarMistakes", [...draft.grammarMistakes, { mistake: "", correction: "", explanation: "" }])}>+ Add correction</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {a.grammarMistakes.map((m, i) => (
                <div key={i} className="bg-background/60 rounded-md p-3 space-y-1">
                  <div className="font-body"><span className="line-through text-destructive/70">{m.mistake}</span>{" → "}<span className="font-semibold text-accent">{m.correction}</span></div>
                  <p className="text-sm text-muted-foreground font-body">{m.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Vocabulary */}
      {(a.vocabularyIssues.length > 0 || editing) && (
        <motion.div variants={stagger.item} className="bg-warning/5 border border-warning/15 rounded-lg p-5">
          <h3 className="flex items-center gap-2 text-lg font-display font-semibold text-warning mb-3">
            <BookOpen className="h-5 w-5" /> Vocabulary to Improve
          </h3>
          {editing ? (
            <div className="space-y-2">
              {draft.vocabularyIssues.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={v.issue} onChange={(e) => { const next = [...draft.vocabularyIssues]; next[i] = { ...v, issue: e.target.value }; update("vocabularyIssues", next); }} placeholder="Issue" className="flex-1" />
                  <Input value={v.suggestion} onChange={(e) => { const next = [...draft.vocabularyIssues]; next[i] = { ...v, suggestion: e.target.value }; update("vocabularyIssues", next); }} placeholder="Suggestion" className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => update("vocabularyIssues", draft.vocabularyIssues.filter((_, j) => j !== i))} className="text-destructive shrink-0"><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update("vocabularyIssues", [...draft.vocabularyIssues, { issue: "", suggestion: "" }])}>+ Add vocabulary item</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {a.vocabularyIssues.map((v, i) => (
                <div key={i} className="font-body"><span className="text-foreground font-medium">{v.issue}</span><span className="text-muted-foreground"> — {v.suggestion}</span></div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Pronunciation */}
      {(a.pronunciationNotes.length > 0 || editing) && (
        <motion.div variants={stagger.item} className="bg-secondary border border-border rounded-lg p-5">
          <h3 className="flex items-center gap-2 text-lg font-display font-semibold text-foreground mb-3">
            <MessageCircle className="h-5 w-5" /> Pronunciation Notes
          </h3>
          {editing ? (
            <EditableStringList items={draft.pronunciationNotes} onChange={(v) => update("pronunciationNotes", v)} label="note" />
          ) : (
            <ul className="space-y-2">
              {a.pronunciationNotes.map((n, i) => <li key={i} className="text-foreground font-body flex items-start gap-2"><span className="text-primary mt-1">•</span> {n}</li>)}
            </ul>
          )}
        </motion.div>
      )}

      {/* Teacher Recommendations */}
      {(a.teacherRecommendations.length > 0 || editing) && (
        <motion.div variants={stagger.item} className="bg-primary/5 border border-primary/15 rounded-lg p-5">
          <h3 className="flex items-center gap-2 text-lg font-display font-semibold text-primary mb-3">
            <Lightbulb className="h-5 w-5" /> Teacher's Recommendations
          </h3>
          {editing ? (
            <EditableStringList items={draft.teacherRecommendations} onChange={(v) => update("teacherRecommendations", v)} label="recommendation" />
          ) : (
            <ul className="space-y-2">
              {a.teacherRecommendations.map((r, i) => <li key={i} className="text-foreground font-body flex items-start gap-2"><span className="text-primary mt-1">{i + 1}.</span> {r}</li>)}
            </ul>
          )}
        </motion.div>
      )}

      {/* Practice Questions */}
      {(a.practiceQuestions?.length > 0 || editing) && (
        editing ? (
          <motion.div variants={stagger.item} className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-lg font-display font-semibold text-foreground mb-3">📝 Practice Questions</h3>
            <div className="space-y-3">
              {draft.practiceQuestions.map((q, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={q.question} onChange={(e) => { const next = [...draft.practiceQuestions]; next[i] = { ...q, question: e.target.value }; update("practiceQuestions", next); }} placeholder="Question" className="flex-1" />
                  <Input value={q.answer} onChange={(e) => { const next = [...draft.practiceQuestions]; next[i] = { ...q, answer: e.target.value }; update("practiceQuestions", next); }} placeholder="Answer" className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => update("practiceQuestions", draft.practiceQuestions.filter((_, j) => j !== i))} className="text-destructive shrink-0"><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update("practiceQuestions", [...draft.practiceQuestions, { question: "", answer: "" }])}>+ Add question</Button>
            </div>
          </motion.div>
        ) : (
          <PracticeQuestions questions={a.practiceQuestions} />
        )
      )}
    </motion.div>
  );
}
