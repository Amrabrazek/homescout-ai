import type { LanguageModelUsage } from 'ai';
import type { AgentCase } from './cases';
import {
  CHECK_LABELS,
  CHECKS,
  type CheckName,
  type CheckResult,
} from './checks';
import type { JudgeScore } from './judge';
import type { ConversationRun } from './run';

export interface ScoredRun extends ConversationRun {
  checks: Partial<Record<CheckName, CheckResult>>;
  judge?: JudgeScore | { error: string };
}

export interface AgentReport {
  generatedAt: Date;
  runs: number;
  models: string[];
  /** The judge model, or why judging was skipped. */
  judge: { model: string } | { skipped: string };
  cases: AgentCase[];
  results: ScoredRun[];
  /** Hand grades keyed `${model}|${caseId}`, compared with the judge on run 1. */
  humanGrades: Record<string, number>;
}

/** USD per million tokens. Cache reads bill at 0.1× input, 5-minute cache writes at 1.25×. */
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'gpt-5-mini': { input: 0.25, output: 2 },
};

export function costUsd(
  modelId: string,
  usage: LanguageModelUsage
): number | null {
  const price = PRICES[modelId];
  if (!price) return null;
  const read = usage.inputTokenDetails?.cacheReadTokens ?? 0;
  const write = usage.inputTokenDetails?.cacheWriteTokens ?? 0;
  const fresh =
    usage.inputTokenDetails?.noCacheTokens ??
    Math.max(0, (usage.inputTokens ?? 0) - read - write);
  const millions =
    fresh * price.input +
    read * price.input * 0.1 +
    write * price.input * 1.25 +
    (usage.outputTokens ?? 0) * price.output;
  return millions / 1_000_000;
}

/** A conversation passes when the API call worked and every check that applies passed. */
export function passed(run: ScoredRun): boolean {
  return !run.error && Object.values(run.checks).every((c) => c?.pass);
}

/** Nearest-rank percentile, p in 0..100. */
export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
}

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const pct = (value: number | null) =>
  value == null ? 'n/a' : `${Math.round(value * 100)}%`;
const ms = (value: number | null) =>
  value == null ? 'n/a' : `${(value / 1000).toFixed(1)} s`;
const usd = (value: number | null) =>
  value == null
    ? 'n/a'
    : `$${value < 0.01 ? value.toFixed(4) : value.toFixed(3)}`;
const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const row = (cells: string[]) => `| ${cells.join(' | ')} |`;
const header = (cells: string[]) => [
  row(cells),
  `|${cells.map(() => '---|').join('')}`,
];

export function renderAgentReport(report: AgentReport): string {
  const { models, results, cases } = report;
  const byModel = (model: string) => results.filter((r) => r.model === model);
  const judgeLabel = 'model' in report.judge ? report.judge.model : null;

  const summary: string[][] = [];
  summary.push([
    '**All checks pass** (conversations)',
    ...models.map((m) => rate(byModel(m).map(passed))),
  ]);
  summary.push([
    `**Cases that pass all ${report.runs} runs**`,
    ...models.map((m) => {
      const ok = cases.filter((c) => {
        const runs = byModel(m).filter((r) => r.caseId === c.id);
        return runs.length > 0 && runs.every(passed);
      }).length;
      return `${ok}/${cases.length}`;
    }),
  ]);
  for (const check of CHECKS) {
    summary.push([
      CHECK_LABELS[check],
      ...models.map((m) =>
        rate(
          byModel(m)
            .map((r) => r.checks[check])
            .filter((c): c is CheckResult => !!c)
            .map((c) => c.pass)
        )
      ),
    ]);
  }
  if (judgeLabel) {
    summary.push([
      `Helpfulness, 1–5 (judge: ${judgeLabel})`,
      ...models.map((m) => {
        const scores = byModel(m)
          .map((r) => r.judge)
          .filter((j): j is JudgeScore => !!j && 'score' in j)
          .map((j) => j.score);
        const value = mean(scores);
        return value == null ? 'n/a' : value.toFixed(2);
      }),
    ]);
  }
  summary.push([
    'Latency per turn, p50 · p95',
    ...models.map((m) => {
      const times = byModel(m).flatMap((r) => r.turns.map((t) => t.ms));
      return `${ms(percentile(times, 50))} · ${ms(percentile(times, 95))}`;
    }),
  ]);
  summary.push([
    'Cost per conversation (mean)',
    ...models.map((m) => {
      const modelId = m.split('/').pop()!;
      const costs = byModel(m).map((r) =>
        r.turns.reduce<number | null>((sum, t) => {
          const c = costUsd(modelId, t.usage);
          return sum == null || c == null ? null : sum + c;
        }, 0)
      );
      return costs.includes(null) ? 'n/a' : usd(mean(costs as number[]));
    }),
  ]);
  const errors = models.map((m) => byModel(m).filter((r) => r.error).length);
  if (errors.some(Boolean))
    summary.push(['API errors (counted as failures)', ...errors.map(String)]);

  const lines = [
    '# Agent evals',
    '',
    `Generated by \`npm run eval\` (frontend) on ${report.generatedAt.toISOString().slice(0, 10)}: ${cases.length} scripted conversations × ${report.runs} runs per model, against the seeded API. Each run uses the same prompt, tools and step limit as \`/api/chat\`, as a new buyer. Cases: \`frontend/src/evals/agent/cases.ts\`.`,
    '',
    '## Summary',
    '',
    ...header(['Check', ...models]),
    ...summary.map(row),
    '',
    judgeLabel
      ? `Checks are deterministic code (\`checks.ts\`); only helpfulness is LLM-judged, with the rubric in \`judge.ts\`. The judge is a different model from the ones it grades.`
      : `Helpfulness judge skipped: ${'skipped' in report.judge ? report.judge.skipped : ''}.`,
    '',
    ...renderCalibration(report),
    '## By case',
    '',
    `Runs that passed every check, out of ${report.runs}. A failing cell names the first failure.`,
    '',
    ...header(['Case', 'Kind', 'Hard part', ...models]),
    ...cases.map((c) =>
      row([
        c.id,
        c.kind,
        c.note,
        ...models.map((m) => {
          const runs = byModel(m).filter((r) => r.caseId === c.id);
          const ok = runs.filter(passed).length;
          const firstFail = runs.find((r) => !passed(r));
          return `${ok === runs.length ? '✅' : '❌'} ${ok}/${runs.length}${firstFail ? ` ${cell(failureText(firstFail))}` : ''}`;
        }),
      ])
    ),
    '',
  ];
  lines.push('');
  return lines.join('\n');
}

function rate(values: boolean[]): string {
  if (!values.length) return 'n/a';
  const ok = values.filter(Boolean).length;
  return `${pct(ok / values.length)} (${ok}/${values.length})`;
}

function failureText(run: ScoredRun): string {
  if (run.error) return `API error: ${run.error.slice(0, 120)}`;
  return Object.entries(run.checks)
    .filter(([, c]) => c && !c.pass)
    .map(([name, c]) => `${name}: ${c!.detail ?? 'failed'}`)
    .join('; ');
}

function renderCalibration(report: AgentReport): string[] {
  if (!('model' in report.judge)) return [];
  const pairs = report.results
    .filter((r) => r.run === 1)
    .map((r) => ({
      human: report.humanGrades[`${r.model}|${r.caseId}`],
      judge: r.judge && 'score' in r.judge ? r.judge.score : undefined,
    }))
    .filter(
      (p): p is { human: number; judge: number } =>
        p.human != null && p.judge != null
    );
  const lines = ['## Judge vs human grades', ''];
  if (!pairs.length) {
    lines.push(
      'No hand grades yet. Grade run 1 of a few conversations in `frontend/src/evals/agent/human-grades.json` (transcripts are in `frontend/.eval/agent-transcripts.md`) to see how far the judge can be trusted.',
      ''
    );
    return lines;
  }
  const exact = pairs.filter((p) => p.human === p.judge).length;
  const near = pairs.filter((p) => Math.abs(p.human - p.judge) <= 1).length;
  const bias = mean(pairs.map((p) => p.judge - p.human))!;
  lines.push(
    `${pairs.length} conversations graded by hand: the judge gave the same score on ${exact} (${pct(exact / pairs.length)}), within one point on ${near} (${pct(near / pairs.length)}), and scores ${bias >= 0 ? '+' : ''}${bias.toFixed(2)} points against the human on average.`,
    ''
  );
  return lines;
}

/** Full transcripts for reading and hand-grading. */
export function renderTranscripts(results: ScoredRun[]): string {
  return results
    .map((r) => {
      const turns = r.turns
        .map((t) => {
          const tools = t.toolCalls
            .map(
              (c) =>
                `- \`${c.name}\` ${JSON.stringify(c.input)}${c.error ? ` → error: ${c.error}` : Array.isArray(c.output?.units) ? ` → ${c.output.units.length} units` : ''}`
            )
            .join('\n');
          return `**Buyer:** ${t.user}\n\n${tools}\n\n**Concierge:** ${t.reply}`;
        })
        .join('\n\n');
      const judge =
        r.judge && 'score' in r.judge
          ? `\n\nJudge: ${r.judge.score}/5, ${r.judge.reason}`
          : '';
      return `## ${r.model} · ${r.caseId} · run ${r.run} · ${passed(r) ? 'pass' : `FAIL (${failureText(r)})`}\n\n${turns}${r.error ? `\n\nError: ${r.error}` : ''}${judge}`;
    })
    .join('\n\n---\n\n');
}
