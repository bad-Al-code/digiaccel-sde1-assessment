import { z } from 'zod';

if (typeof window !== 'undefined') {
  throw new Error('env.ts was imported from the browser. Server-only module.');
}

const DURATION_PATTERN = /^\d+(ms|s|m|h|d)$/;

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    MONGODB_URI: z
      .string()
      .trim()
      .min(1, 'MONGODB_URI is required')
      .refine(
        (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
        'MONGODB_URI must start with mongodb:// or mongodb+srv://',
      ),
    MONGODB_DB_NAME: z.string().trim().min(1, 'MONGODB_DB_NAME is required'),

    JWT_ACCESS_SECRET: z
      .string()
      .trim()
      .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z
      .string()
      .trim()
      .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    ACCESS_TOKEN_TTL: z.string().trim().regex(DURATION_PATTERN, 'e.g. 15m').default('15m'),
    REFRESH_TOKEN_TTL: z.string().trim().regex(DURATION_PATTERN, 'e.g. 30d').default('30d'),

    APP_BASE_URL: z.url('APP_BASE_URL must be a valid URL').default('http://localhost:3000'),
  })
  .superRefine((value, ctx) => {
    if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment variables:\n${issues}\n`);
}

export const env = Object.freeze(parsed.data);

export type Env = typeof env;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
