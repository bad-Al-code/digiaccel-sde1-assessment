const baseUrl = process.argv[2];

if (!baseUrl) {
  console.error('Usage: node scripts/smoke-check.mjs <base-url>');
  process.exit(1);
}

const MAX_ATTEMPTS = 10;
const DELAY_MS = 6000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function probe(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(15_000),
  });

  return { status: response.status, body: await response.text() };
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const liveness = await probe('/api/health');

      if (liveness.status === 200) {
        console.log(`liveness ok on attempt ${attempt}`);

        const readiness = await probe('/api/health/ready');
        console.log(`readiness status ${readiness.status}`);
        console.log(readiness.body.slice(0, 400));

        if (readiness.status !== 200) {
          console.error('Deployment is live but not ready. Failing the workflow.');
          process.exit(1);
        }

        console.log('Smoke check passed.');
        return;
      }

      console.log(`attempt ${attempt}: liveness returned ${liveness.status}`);
    } catch (error) {
      console.log(`attempt ${attempt}: ${error instanceof Error ? error.message : error}`);
    }

    await delay(DELAY_MS);
  }

  console.error(`Deployment never became reachable after ${MAX_ATTEMPTS} attempts.`);
  process.exit(1);
}

await main();
