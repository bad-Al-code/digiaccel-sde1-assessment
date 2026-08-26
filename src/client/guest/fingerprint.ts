'use client';

let cached: Promise<string | null> | null = null;

async function computeFingerprint(): Promise<string | null> {
  try {
    const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default;
    const agent = await FingerprintJS.load();
    const result = await agent.get();

    return result.visitorId;
  } catch {
    return null;
  }
}

export function getFingerprint(): Promise<string | null> {
  cached ??= computeFingerprint();

  return cached;
}
