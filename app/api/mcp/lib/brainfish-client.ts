import { BrainfishClient } from '../../../../src/client';
import type { BrainfishSessionData } from '../../../../src/types';

export function createBrainfishClient(
  session: BrainfishSessionData,
): BrainfishClient {
  if (!session.apiToken) {
    throw new Error('Brainfish API token is required');
  }

  return new BrainfishClient(session);
}
