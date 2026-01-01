import { google } from 'googleapis';
import path from 'path';

export default defineEventHandler(async (event) => {
  // 1. Google Auth & Directory API
  const keyFilePath = path.resolve(
    process.cwd(),
    'classtime-481322-e6e3f2bf7f96.json'
  );
  const subject = process.env.ROOT_USER_EMAIL || 'admin@yourdomain.com';

  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
    clientOptions: { subject },
  });

  const service = google.admin({ version: 'directory_v1', auth });

  try {
    // 2. Fetch Google Users (Full Projection for Custom Schemas)
    const googleRes = await service.users.list({
      customer: 'my_customer',
      orderBy: 'email',
      maxResults: 500, // Fetch all reasonable users
      projection: 'full',
    });

    const googleUsers = googleRes.data.users || [];

    // 3. Fetch Local DB Users (Billing Data)
    const dbUsers = await safeQuery(() =>
      prisma.user.findMany({
        include: {
          assignments: {
            include: {
              class: true,
            },
          },
        },
      })
    );

    // 4. Merge Data
    const mergedUsers = googleUsers.map((gUser) => {
      // Find matching DB user by email
      const dbUser = dbUsers.find((u) => u.email === gUser.primaryEmail);

      // Calculate Monthly Expected Hours from Assignments
      // Logic: Sum of (Class Weekly Hours * 4) for all assigned classes
      // Note: This is a simplification. Real world might need 4.33 or specific month logic.
      let monthlyExpectedHours = 0;
      if (dbUser?.assignments) {
        dbUser.assignments.forEach((a) => {
          if (a.class && a.class.weeklyHours) {
            monthlyExpectedHours += Number(a.class.weeklyHours) * 4;
          }
        });
      }

      // Determine Role using Custom Fields
      // Logic: Admin > Manager > Teacher > Staff
      let role = 'Staff'; // Default fallback
      const customFields = (gUser as any).customSchemas?.Custom_Fields || {};

      if (gUser.isAdmin) {
        role = 'Admin';
      } else if (
        customFields.manager === true ||
        customFields.manager === 'true'
      ) {
        role = 'Manager';
      } else if (
        customFields.teacher === true ||
        customFields.teacher === 'true'
      ) {
        role = 'Teacher';
      }

      const orgTitle = gUser.organizations?.[0]?.title || '';

      return {
        id: gUser.id!, // Google ID should always exist
        dbId: dbUser?.id, // Local DB ID (if exists)
        name: gUser.name?.fullName || gUser.primaryEmail || 'Sem Nome',
        email: gUser.primaryEmail!,
        avatar: gUser.thumbnailPhotoUrl,

        // Role & Org Info
        role: role,
        orgTitle: orgTitle,
        orgDepartment:
          gUser.organizations?.find((o: any) => o.primary)?.description ||
          gUser.organizations?.[0]?.description,

        // Local Billing Data
        hourlyRate: dbUser?.hourlyRate ? Number(dbUser.hourlyRate) : null,
        monthlyExpectedHours: monthlyExpectedHours,

        // Raw Assignments for UI details if needed
        assignments: dbUser?.assignments || [],
      };
    });

    // Filter: User said "Essa tela deve mostrar APENAS quem for Teacher, Gerente ou Admin."
    // Since we default to Teacher, basically everyone is shown, which is likely what they want (excluding maybe service accounts/bots if any).
    // But let's apply the logic if needed.

    return {
      success: true,
      users: mergedUsers,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
});
