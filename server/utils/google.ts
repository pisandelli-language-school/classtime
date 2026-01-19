import { google } from 'googleapis';
import path from 'path';

export const getGoogleAuth = () => {
  const subject = process.env.ROOT_USER_EMAIL;
  if (!subject) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Server configuration error: ROOT_USER_EMAIL is not defined.',
    });
  }

  // 1. Try Environment Variable (Best for Vercel/Production)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      return new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/admin.directory.user.readonly',
        ],
        clientOptions: { subject },
      });
    } catch (e) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON', e);
      throw createError({
        statusCode: 500,
        statusMessage: 'Invalid Google Service Account configuration.',
      });
    }
  }

  // 2. Fallback to Local File (Development)
  const keyFilePath = path.resolve(
    process.cwd(),
    'classtime-481322-e6e3f2bf7f96.json',
  );

  return new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
    clientOptions: { subject },
  });
};

export const getGoogleDirectoryService = () => {
  const auth = getGoogleAuth();
  return google.admin({ version: 'directory_v1', auth });
};
