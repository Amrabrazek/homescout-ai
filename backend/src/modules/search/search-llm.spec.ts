import { ConfigService } from '@nestjs/config';
import { createSearchLlm } from './search-llm';

const config = (env: Record<string, string>) =>
  ({ get: (key: string) => env[key] }) as unknown as ConfigService;

describe('createSearchLlm', () => {
  it('is off unless the flag is set', () => {
    expect(createSearchLlm(config({ ANTHROPIC_API_KEY: 'k' }))).toBeNull();
  });

  it('needs an API key for the provider', () => {
    expect(
      createSearchLlm(
        config({ SEARCH_LLM_ENABLED: 'true', LLM_PROVIDER: 'openai' })
      )
    ).toBeNull();
  });

  it('uses LLM_PROVIDER and LLM_MODEL when enabled', () => {
    expect(
      createSearchLlm(
        config({
          SEARCH_LLM_ENABLED: 'true',
          ANTHROPIC_API_KEY: 'k',
          LLM_MODEL: 'claude-test',
        })
      )?.model
    ).toBe('anthropic/claude-test');
  });
});
