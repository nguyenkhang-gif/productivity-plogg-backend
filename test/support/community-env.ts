import '../../src/polyfills';

if (!process.env.POSTGRES_URL) {
  throw new Error(
    'POSTGRES_URL is not set. Refusing to run community e2e tests ' +
      'against an unknown database.',
  );
}

const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  JWT_SECRET_KEY: 'e2e-secret-key-e2e-secret-key-e2e-secret-key',
  JWT_EXPIRATION_TIME: '900s',
  MONGO_DB_URI: 'mongodb://unused',
  EMAIL_USER: 'e2e@example.test',
  EMAIL_PASS: 'e2e-pass',
  PORT: '0',
  REDIS_URL: 'redis://127.0.0.1:6390',
  GEMINI_API_KEY: 'e2e-gemini',
  SUPABASE_URL: 'http://127.0.0.1:1',
  SUPABASE_SERVICE_ROLE_KEY: 'e2e-supabase',
  SUPABASE_BUCKET_NAME: 'e2e-bucket',
  CLOUDINARY_CLOUD_NAME: 'e2e',
  CLOUDINARY_API_KEY: 'e2e',
  CLOUDINARY_API_SECRET: 'e2e',
  GOOGLE_CLIENT_ID: 'e2e',
  GOOGLE_CLIENT_SECRET: 'e2e',
  GOOGLE_CALLBACK_URL: 'http://127.0.0.1:1/google/callback',
  FACEBOOK_APP_ID: 'e2e',
  FACEBOOK_APP_SECRET: 'e2e',
  FACEBOOK_CALLBACK_URL: 'http://127.0.0.1:1/facebook/callback',
  GOOGLE_OAUTH_CLIENT_ID: 'e2e',
  GOOGLE_OAUTH_CLIENT_SECRET: 'e2e',
  GOOGLE_OAUTH_REFRESH_TOKEN: 'e2e',
  GOOGLE_DRIVE_FOLDER_ID: 'e2e',
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] = value;
}
