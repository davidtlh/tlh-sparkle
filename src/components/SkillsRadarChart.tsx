import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

export interface SkillsProfile {
  grammarTenses: number;
  prepositions: number;
  vocabulary: number;
  expressionsIdioms: number;
  accuracy: number;
  businessLanguage: number;
}

interface SkillsRadarChartProps {
  skills: SkillsProfile;
  studentName?: string;
}

export function SkillsRadarChart({ skills, studentName }: SkillsRadarChartProps) {
  const data = [
    { skill: "Grammar/tenses", value: skills.grammarTenses },
    { skill: "Prepositions", value: skills.prepositions },
    { skill: "Vocabulary", value: skills.vocabulary },
    { skill: "Expressions/idioms", value: skills.expressionsIdioms },
    { skill: "Accuracy", value: skills.accuracy },
    { skill: "Business language", value: skills.businessLanguage },
  ];

  return (
    <div className="w-full">
      <h3 className="text-lg font-display font-semibold text-foreground mb-2 text-center">
        {studentName ? `${studentName} – ` : ""}Skills Profile
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 10]}
            tickCount={6}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          <Radar
            name="Skills"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
