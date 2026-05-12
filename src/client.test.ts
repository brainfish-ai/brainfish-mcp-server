import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrainfishClient } from './client';

describe('BrainfishClient.generateUserAnswer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the answer from non-streaming JSON responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            conversationId: '01234567890123456789012345',
            query: 'What is Brainfish?',
            answer: 'Brainfish is an AI support platform.',
            citations: [],
            handoff: false,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const client = new BrainfishClient({ apiToken: 'bf_test_token' });

    await expect(
      client.generateUserAnswer({
        query: 'What is Brainfish?',
        stream: false,
      }),
    ).resolves.toBe('Brainfish is an AI support platform.');
  });
});
