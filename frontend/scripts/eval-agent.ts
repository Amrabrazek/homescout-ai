import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { generateText } from 'ai';
import {
  languageModel,
  llmConfig,
  type LlmConfig,
} from '@/lib/concierge/model';
import { AGENT_CASES } from '@/evals/agent/cases';
import { runChecks } from '@/evals/agent/checks';
import { judgeHelpfulness } from '@/evals/agent/judge';
import {
  renderAgentReport,
  renderTranscripts,
  type AgentReport,
  type ScoredRun,
} from '@/evals/agent/report';
import { runConversation } from '@/evals/agent/run';

const ROOT = resolve(__dirname, '..');
const REPORT = resolve(ROOT, '../docs/evals/agent.md');
const TRANSCRIPTS = resolve(ROOT, '.eval/agent-transcripts.md');
const HUMAN_GRADES = resolve(ROOT, 'src/evals/agent/human-grades.json');

for (const file of ['.env.local', '.env', '../.env']) {
  const path = resolve(ROOT, file);
  if (existsSync(path)) process.loadEnvFile(path);
}

const API_URL = process.env.API_URL || 'http://localhost:3001';
const RUNS = Number(process.env.EVAL_RUNS || 3);
const CONCURRENCY = Number(process.env.EVAL_CONCURRENCY || 4);
/** provider:model pairs. The judge differs from both, so no model grades itself. */
const MODELS = (
  process.env.EVAL_MODELS ||
  'anthropic:claude-haiku-5-5,anthropic:claude-sonnet-5-5'
).split(',');
const JUDGE = process.env.EVAL_JUDGE ?? 'anthropic:claude-opus-5-5';
const ONLY = process.env.EVAL_CASES?.split(',');

/**
 * Agent evals: plays scripted buyer conversations against the concierge, runs
 * deterministic checks and an LLM helpfulness judge, and writes
 * docs/evals/agent.md. Needs the API running (`npm run start:dev` in backend)
 * and an LLM key.
 */
async function main() {
  const configs = MODELS.map(parseModel);
  const cases = AGENT_CASES.filter((c) => !ONLY || ONLY.includes(c.id));
  const projectNames = await loadProjectNames();
  await preflight(configs[0]);

  const jobs = configs.flatMap((config) =>
    cases.flatMap((testCase) =>
      Array.from({ length: RUNS }, (_, i) => ({
        config,
        testCase,
        run: i + 1,
      }))
    )
  );
  console.log(
    `Running ${jobs.length} conversations (${cases.length} cases × ${RUNS} runs × ${configs.length} models)`
  );

  let done = 0;
  const results = await pool(
    jobs,
    CONCURRENCY,
    async ({ config, testCase, run }) => {
      const conversation = await runConversation(testCase, config, run);
      const scored: ScoredRun = {
        ...conversation,
        checks: conversation.error
          ? {}
          : runChecks(testCase, conversation.turns, projectNames),
      };
      if (!conversation.error && JUDGE !== 'off') {
        scored.judge = await judgeHelpfulness(
          parseModel(JUDGE),
          conversation.turns
        ).catch((error) => ({ error: String(error) }));
      }
      done += 1;
      if (done % 10 === 0 || done === jobs.length)
        console.log(`  ${done}/${jobs.length}`);
      return scored;
    }
  );

  const report: AgentReport = {
    generatedAt: new Date(),
    runs: RUNS,
    models: configs.map((c) => `${c.provider}/${c.modelId}`),
    judge:
      JUDGE === 'off'
        ? { skipped: 'EVAL_JUDGE=off' }
        : { model: JUDGE.replace(':', '/') },
    cases,
    results,
    humanGrades: existsSync(HUMAN_GRADES)
      ? JSON.parse(readFileSync(HUMAN_GRADES, 'utf8'))
      : {},
  };

  mkdirSync(resolve(REPORT, '..'), { recursive: true });
  writeFileSync(REPORT, renderAgentReport(report));
  mkdirSync(resolve(TRANSCRIPTS, '..'), { recursive: true });
  writeFileSync(TRANSCRIPTS, renderTranscripts(results));
  console.log(`Wrote ${REPORT}\nTranscripts: ${TRANSCRIPTS}`);
}

function parseModel(spec: string): LlmConfig {
  const [provider, modelId] = spec.split(':');
  return llmConfig({
    ...process.env,
    LLM_PROVIDER: provider,
    LLM_MODEL: modelId,
  });
}

/** Catalog project names, so the grounding check can spot ones the agent names without a tool result. */
async function loadProjectNames(): Promise<string[]> {
  const response = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: '{ projects(limit: 1000) { name area city region } }',
    }),
  }).catch(() => null);
  if (!response?.ok)
    throw new Error(
      `The API is not reachable at ${API_URL}; start it with \`npm run start:dev\` in backend/`
    );
  const { data } = await response.json();
  const projects: {
    name: string;
    area?: string;
    city?: string;
    region?: string;
  }[] = data.projects;
  const places = new Set(
    projects
      .flatMap((p) => [p.area, p.city, p.region])
      .filter(Boolean)
      .map((p) => p!.toLowerCase())
  );
  return projects
    .map((p) => p.name)
    .filter((name) => !places.has(name.toLowerCase()));
}

/** One cheap call first, so a missing or rejected key fails fast instead of 100 times. */
async function preflight(config: LlmConfig) {
  try {
    await generateText({
      model: languageModel(config),
      prompt: 'Say ok.',
      maxOutputTokens: 200,
    });
  } catch (error) {
    throw new Error(
      `The ${config.provider} API rejected a test call (${String(error).slice(0, 200)}). Check the API key.`
    );
  }
}

async function pool<T, R>(
  items: T[],
  size: number,
  work: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(size, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await work(items[index]);
      }
    }
  );
  await Promise.all(workers);
  return results;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
