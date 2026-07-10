import Joi from 'joi';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend root
config({ path: join(__dirname, '..', '..', '.env') });

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),

  // Database
  DATABASE_URL: Joi.string().required().messages({
    'any.required': 'DATABASE_URL is required. Set it in backend/.env',
  }),

  // Redis
  REDIS_URL: Joi.string().required().messages({
    'any.required': 'REDIS_URL is required. Set it in backend/.env',
  }),

  // JWT
  JWT_SECRET: Joi.string().min(16).required().messages({
    'any.required': 'JWT_SECRET is required. Must be at least 16 characters.',
    'string.min': 'JWT_SECRET must be at least 16 characters long.',
  }),
  JWT_REFRESH_SECRET: Joi.string().min(16).required().messages({
    'any.required': 'JWT_REFRESH_SECRET is required.',
    'string.min': 'JWT_REFRESH_SECRET must be at least 16 characters long.',
  }),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),

  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().allow('').default('PLACEHOLDER_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').default('PLACEHOLDER_CLIENT_SECRET'),
}).unknown(true); // Allow other env vars

const { error, value: envVars } = envSchema.validate(process.env, {
  abortEarly: false,
});

if (error) {
  const messages = error.details.map((d) => `  ✗ ${d.message}`).join('\n');
  console.error(`\n❌ Environment validation failed:\n${messages}\n`);
  process.exit(1);
}

export const env = {
  nodeEnv: envVars.NODE_ENV,
  isDev: envVars.NODE_ENV === 'development',
  isProd: envVars.NODE_ENV === 'production',
  port: envVars.PORT,

  databaseUrl: envVars.DATABASE_URL,
  redisUrl: envVars.REDIS_URL,

  jwt: {
    secret: envVars.JWT_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    accessExpiry: envVars.JWT_ACCESS_EXPIRY,
    refreshExpiry: envVars.JWT_REFRESH_EXPIRY,
  },

  corsOrigin: envVars.CORS_ORIGIN,

  google: {
    clientId: envVars.GOOGLE_CLIENT_ID,
    clientSecret: envVars.GOOGLE_CLIENT_SECRET,
  },
};
