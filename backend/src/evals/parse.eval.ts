import { LlmQueryParser } from '../modules/search/llm-query-parser';
import {
  LocationVocabulary,
  parseSearchQuery,
} from '../modules/search/query-parser';
import { PARSE_CASES } from './fixtures/parse-cases';
import {
  ExpectedFilter,
  FilterDiff,
  compareFilters,
  percentile,
  toExpectedShape,
} from './metrics';

export interface ParseCaseResult {
  query: string;
  note: string;
  expected: ExpectedFilter;
  regex: { got: ExpectedFilter; diff: FilterDiff };
  llm?: {
    got: ExpectedFilter;
    diff: FilterDiff;
    /** Regex left words over, so the LLM was asked. */
    asked: boolean;
    /** Asked, but the parser fell back to the regex (error, timeout, bad output). */
    fellBack: boolean;
  };
}

export interface ParseEvalResult {
  cases: ParseCaseResult[];
  /** "provider/model", or why the LLM leg was skipped. */
  llm: { model: string } | { skipped: string };
  llmLatencyMs: { p50: number | null; p95: number | null; calls: number };
}

/**
 * Regex alone vs regex + LLM on the same queries. The LLM parser keeps the
 * regex result on any failure, so `fellBack` tells a real answer from a
 * silent fallback. Pass a fresh parser: its cache and daily cap are per instance.
 */
export async function runParseEval(
  vocabulary: LocationVocabulary,
  llm: { parser: LlmQueryParser; model: string } | { skipped: string }
): Promise<ParseEvalResult> {
  const cases: ParseCaseResult[] = [];
  const latencies: number[] = [];

  for (const { query, expected, note } of PARSE_CASES) {
    const regex = parseSearchQuery(query, vocabulary);
    const regexShape = toExpectedShape(regex.filter);
    const result: ParseCaseResult = {
      query,
      note,
      expected,
      regex: { got: regexShape, diff: compareFilters(expected, regexShape) },
    };

    if ('parser' in llm) {
      const started = performance.now();
      const refined = await llm.parser.refine(query, regex, vocabulary);
      const asked = !!regex.text;
      const fellBack = asked && refined.filter === regex.filter;
      if (asked && !fellBack) latencies.push(performance.now() - started);
      const shape = toExpectedShape(refined.filter);
      result.llm = {
        got: shape,
        diff: compareFilters(expected, shape),
        asked,
        fellBack,
      };
    }
    cases.push(result);
  }

  return {
    cases,
    llm: 'parser' in llm ? { model: llm.model } : llm,
    llmLatencyMs: {
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      calls: latencies.length,
    },
  };
}
