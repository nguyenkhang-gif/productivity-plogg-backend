import { registerAs } from '@nestjs/config';

export default registerAs('google', () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_CLIENT_EMAIl;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PRIVATE_KEY;

  // Debug log
  console.log('[Google Config] clientEmail:', clientEmail);
  console.log('[Google Config] privateKey exists:', !!privateKey);
  console.log('[Google Config] privateKey length:', privateKey?.length);

  return {
    clientEmail,
    privateKey,
  };
});
