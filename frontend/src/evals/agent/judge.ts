import { generateText } from 'ai';
import { languageModel, type LlmConfig } from '@/lib/concierge/model';
import type { TurnTranscript } from './checks';

/**
 * Only helpfulness goes to the judge. Grounding, constraints and scope are
 * deterministic checks, which are cheaper, repeatable and don't drift.
 */
export const HELPFULNESS_RUBRIC = `Score how helpful the real-estate concierge's replies are to this buyer, from 1 to 5.

5: Moves the buyer forward in the fewest words. Each recommended home gets a short reason tied to what the buyer said. Trade-offs or next steps are clear. If nothing matched, it says which need is too strict and offers a concrete way to relax it. A clarifying question is short and asks only for what is missing.
4: Helpful and correct, with one small gap: a reason that is generic, a little padding, or a missed easy next step.
3: Usable but generic: lists homes without saying why they fit, repeats card details, or asks a question it could have answered itself.
2: Mostly unhelpful: ignores part of the request, buries the answer, or asks several questions at once.
1: Wrong or useless: off-topic, invents facts, or refuses something it should do.

The app shows unit cards from tool results next to the reply, so not repeating unit details in text is correct, not a gap. Judge helpfulness only; facts are checked elsewhere.`;

export interface JudgeScore {
  score: number;
  reason: string;
}

export async function judgeHelpfulness(
  config: LlmConfig,
  turns: TurnTranscript[]
): Promise<JudgeScore> {
  const transcript = turns
    .map((turn) => {
      const tools = turn.toolCalls
        .map((c) => {
          const n = Array.isArray(c.output?.units)
            ? `, ${c.output.units.length} units`
            : '';
          return `  - ${c.name}(${JSON.stringify(c.input)})${c.error ? ' failed' : n}`;
        })
        .join('\n');
      return `BUYER: ${turn.user}\nTOOLS:\n${tools || '  (none)'}\nCONCIERGE: ${turn.reply}`;
    })
    .join('\n\n');

  const { text } = await generateText({
    model: languageModel(config),
    instructions: HELPFULNESS_RUBRIC,
    prompt: `${transcript}\n\nReply with only JSON: {"score": <1-5>, "reason": "<one sentence>"}`,
    maxOutputTokens: 2000,
  });
  return parseScore(text);
}

export function parseScore(text: string): JudgeScore {
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  const parsed = json ? JSON.parse(json) : null;
  const score = Number(parsed?.score);
  if (!Number.isInteger(score) || score < 1 || score > 5)
    throw new Error(`Judge returned no score: ${text.slice(0, 200)}`);
  return { score, reason: String(parsed.reason ?? '') };
}
