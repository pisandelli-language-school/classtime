import { google } from 'googleapis';
import path from 'path';

export default defineEventHandler(async (event) => {
  // 1. Load Credentials
  // In a real app, use runtime config. For this test, we read the specific JSON file.
  // Assuming the file is in the project root.
  const keyFilePath = path.resolve(
    process.cwd(),
    'classtime-481322-e6e3f2bf7f96.json'
  );

  // 2. Admin Email for Impersonation (Domain-Wide Delegation)
  // CRITICAL: This must be an admin user in the Workspace
  const subject = process.env.ROOT_USER_EMAIL || 'admin@yourdomain.com';

  // 3. Configure Auth
  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
    clientOptions: {
      subject: subject, // Impersonate this user
    },
  });

  // 4. Create Directory Service
  const service = google.admin({ version: 'directory_v1', auth });

  try {
    // 5. List Users
    const res = await service.users.list({
      customer: 'my_customer',
      orderBy: 'email',
      maxResults: 20,
    });

    const users = res.data.users || [];

    return {
      success: true,
      subject_used: subject,
      count: users.length,
      users: users.map((u) => ({
        id: u.id,
        name: u.name?.fullName,
        email: u.primaryEmail,
        orgUnitPath: u.orgUnitPath,
        isAdmin: u.isAdmin,
        suspended: u.suspended,
        organizations: u.organizations,
      })),
    };
  } catch (error: any) {
    return {
      success: false,
      subject_used: subject,
      error: error.message,
      details: error,
    };
  }
});
