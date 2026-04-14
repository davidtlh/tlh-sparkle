import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript } = await req.json();
    if (!transcript) {
      return new Response(JSON.stringify({ error: "No transcript provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert EFL (English as a Foreign Language) lesson analyzer. Given a transcript of a one-on-one EFL lesson between a teacher and a student, extract a structured summary.

Focus on:
1. Grammar mistakes the student made and corrections provided by the teacher
2. Vocabulary issues or suggestions
3. Pronunciation notes mentioned by the teacher
4. Specific recommendations from the teacher
5. Things the student did well (strengths)
6. Generate exactly 10 EFL practice questions that test the specific grammar, vocabulary, and language points covered in the lesson. Each question should be a fill-in-the-blank, multiple choice, or sentence correction exercise directly related to the student's mistakes and lesson content. Include the correct answer for each question.
7. A skills profile rating the student from 1-10 on these categories: Grammar/tenses, Prepositions, Vocabulary, Expressions/idioms, Accuracy, Business language. Base the scores on evidence from the transcript.

You MUST respond using the suggest_analysis tool. Be specific and use examples from the transcript.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this EFL lesson transcript:\n\n${transcript}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_analysis",
              description: "Return the structured EFL lesson analysis",
              parameters: {
                type: "object",
                properties: {
                  overallLevel: { type: "string", description: "Student's estimated CEFR level (A1-C2)" },
                  lessonTopic: { type: "string", description: "Main topic of the lesson" },
                  grammarMistakes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        mistake: { type: "string" },
                        correction: { type: "string" },
                        explanation: { type: "string" },
                      },
                      required: ["mistake", "correction", "explanation"],
                    },
                  },
                  vocabularyIssues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        issue: { type: "string" },
                        suggestion: { type: "string" },
                      },
                      required: ["issue", "suggestion"],
                    },
                  },
                  pronunciationNotes: { type: "array", items: { type: "string" } },
                  teacherRecommendations: { type: "array", items: { type: "string" } },
                  strengths: { type: "array", items: { type: "string" } },
                  practiceQuestions: {
                    type: "array",
                    description: "Exactly 10 EFL practice questions based on the lesson content",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string", description: "The practice question (fill-in-blank, multiple choice, or correction)" },
                        answer: { type: "string", description: "The correct answer" },
                      },
                      required: ["question", "answer"],
                    },
                  },
                  skillsProfile: {
                    type: "object",
                    description: "Student skills rated 1-10",
                    properties: {
                      grammarTenses: { type: "number", description: "Grammar/tenses score 1-10" },
                      prepositions: { type: "number", description: "Prepositions score 1-10" },
                      vocabulary: { type: "number", description: "Vocabulary score 1-10" },
                      expressionsIdioms: { type: "number", description: "Expressions/idioms score 1-10" },
                      accuracy: { type: "number", description: "Accuracy score 1-10" },
                      businessLanguage: { type: "number", description: "Business language score 1-10" },
                    },
                    required: ["grammarTenses", "prepositions", "vocabulary", "expressionsIdioms", "accuracy", "businessLanguage"],
                  },
                },
                required: [
                  "overallLevel", "lessonTopic", "grammarMistakes",
                  "vocabularyIssues", "pronunciationNotes",
                  "teacherRecommendations", "strengths", "practiceQuestions",
                  "skillsProfile",
                ],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis returned from AI");

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-lesson error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
