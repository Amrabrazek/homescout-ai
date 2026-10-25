# Concierge memory evals

Hand-written log of the targeted agent eval runs behind concierge memory (#75, #76, #77). `npm run eval` overwrites `agent.md` with the full suite, so these subset runs are kept here. All runs: Haiku 5.5 (`EVAL_MODELS=anthropic:claude-haiku-5-5`), `EVAL_JUDGE=off`, 3 runs per case, on Amr's Mac against the seeded API. Cases: `frontend/src/evals/agent/cases.ts`.

## Returning buyer: "About this buyer" block (PR #78)

`EVAL_CASES=returning-vague,returning-partial`. Baseline is 018d6fa (eval cases only, no context block); fix is a2db211.

| | Baseline | With the block |
|---|---|---|
| returning-vague ("Anything new for me?") | 3/3 | 3/3 |
| returning-partial ("options with a swimming pool") | 1/3 (2 runs asked again for budget, area and type) | 3/3 |
| All checks pass | 4/6 | 6/6 |
| Chats that called `get_preferences` | 4/6 | 0/6 |
| Latency per turn, p50 · p95 | 5.5 s · 9.3 s | 5.9 s · 6.8 s |

Spend: about $0.012 for both runs.

## Last-chat summary (PR #84)

`EVAL_CASES=last-chat-compared`. The earlier chat compares two apartments; a new chat asks "Last time you compared two apartments for me. Which ones were they?". Only the stored summary of the last chat knows the answer.

| Check | Result |
|---|---|
| `recallsLastChat`: names every compared project, no `search_units` in that turn | 3/3 |
| Grounded | 3/3 |

Spend: about $0.009.

Caveats:
- In 1 of the 3 runs the summary invented a detail about one of the apartments, and the reply repeated it. The check only looks for project names, so it can't catch this.
- "First and third" in the earlier chat is ambiguous, because the agent's numbered list and the card order differ. All 3 runs flagged it.

## Not run yet

`remembered-kids`, `remembered-wfh` (#76) and `follow-up-yes-please` (the 2-turn regression guard from #81).
