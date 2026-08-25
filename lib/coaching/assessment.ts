// Development Compass scoring (ported from the validated MVP service).

export type AssessmentAnswer = { questionId: string; domain: string; value: number };

export type AssessmentInsight = {
  domainScores: Record<string, number>;
  leadingDomain: string;
  growthDomain: string;
  insight: string;
  actionItems: Array<{ title: string; description: string }>;
};

export function scoreDevelopmentAssessment(answers: AssessmentAnswer[]): AssessmentInsight {
  const sums: Record<string, { total: number; count: number }> = {};
  for (const answer of answers) {
    const existing = sums[answer.domain] ?? { total: 0, count: 0 };
    existing.total += answer.value;
    existing.count += 1;
    sums[answer.domain] = existing;
  }

  const domainScores = Object.fromEntries(
    Object.entries(sums).map(([domain, score]) => [domain, Math.round((score.total / Math.max(1, score.count)) * 20)]),
  );
  const ranked = Object.entries(domainScores).sort((a, b) => b[1] - a[1]);
  const leadingDomain = ranked[0]?.[0] ?? "Clarity";
  const growthDomain = ranked.at(-1)?.[0] ?? leadingDomain;

  return {
    domainScores,
    leadingDomain,
    growthDomain,
    insight: `Your strongest current resource is ${leadingDomain}. The next useful area to explore is ${growthDomain}; a small, repeatable practice is likely to create more momentum than trying to solve everything at once.`,
    actionItems: [
      {
        title: `Name one ${growthDomain.toLowerCase()} decision`,
        description: "Set aside 15 uninterrupted minutes this week to write what you know, what remains uncertain, and the next helpful question.",
      },
      { title: "Capture the evidence", description: "After one meaningful interaction, journal one observation about what increased or reduced your momentum." },
    ],
  };
}
