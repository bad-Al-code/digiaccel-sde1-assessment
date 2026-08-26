import { FIXTURE_PASSWORD, fixtureEmail } from './fixtures';
import { TestClient } from './test-client';

export interface Session {
  readonly client: TestClient;
  readonly email: string;
}

export async function createSession(baseUrl: string, label = 'user'): Promise<Session> {
  const client = new TestClient(baseUrl);
  const email = fixtureEmail(label);

  const response = await client.post('/api/auth/register', {
    name: `Fixture ${label}`,
    email,
    password: FIXTURE_PASSWORD,
  });

  if (response.status !== 201) {
    throw new Error(`Could not create session: ${response.status} ${response.raw.slice(0, 200)}`);
  }

  return { client, email };
}

export interface TaskSeed {
  title: string;
  startAt: string;
  endAt?: string | null;
  description?: string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
}

interface TaskRecord {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  status: string;
  priority: string | null;
  completedAt: string | null;
  description: string | null;
}

export async function seedTask(client: TestClient, seed: TaskSeed): Promise<TaskRecord> {
  const response = await client.post<{ success: boolean; data: TaskRecord }>('/api/tasks', seed);

  if (response.status !== 201) {
    throw new Error(`Seed failed: ${response.status} ${response.raw.slice(0, 250)}`);
  }

  return response.body.data;
}

export type { TaskRecord };
