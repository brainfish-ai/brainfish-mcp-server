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

  it('returns the answer from streaming answer-text-chunk events', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            [
              'data: {"type":"conversation-id","conversationId":"01234567890123456789012345"}',
              '',
              'data: {"type":"answer-text-chunk","content":"Brainfish is "}',
              '',
              'data: {"type":"answer-text-chunk","content":"an AI support platform."}',
              '',
              'data: {"type":"citations","citations":[]}',
              '',
              '',
            ].join('\n'),
          ),
        );
        controller.close();
      },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );

    const client = new BrainfishClient({ apiToken: 'bf_test_token' });

    await expect(
      client.generateUserAnswer({
        query: 'What is Brainfish?',
        stream: true,
      }),
    ).resolves.toBe('Brainfish is an AI support platform.');
  });
});
