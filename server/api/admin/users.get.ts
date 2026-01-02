import { google } from 'googleapis';
import path from 'path';

export default defineEventHandler(async (event) => {
  // 1. Google Auth & Directory API
  const keyFilePath = path.resolve(
    process.cwd(),
    'classtime-481322-e6e3f2bf7f96.json'
  );

  const subject = process.env.ROOT_USER_EMAIL;
  if (!subject) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Server configuration error: ROOT_USER_EMAIL is not defined in environment variables.',
    });
  }

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
              class: {
                include: { contracts: { where: { status: 'ACTIVE' } } },
              },
              student: {
                include: { contracts: { where: { status: 'ACTIVE' } } },
              },
            },
          },
        },
      })
    );

    // 4. Merge Data
    const mergedUsers = googleUsers.map((gUser) => {
      // Find matching DB user by email
      // Find matching DB user by email
      const dbUser = dbUsers?.find(
        (u) => u.email.toLowerCase() === gUser.primaryEmail?.toLowerCase()
      );

      // Calculate Monthly Expected Hours from Assignments
      // Logic: Sum of (Weekly Hours * 4) for all assigned classes/students
      // Priority: Active Contract > Legacy Class Field
      let monthlyExpectedHours = 0;
      if (dbUser?.assignments) {
        dbUser.assignments.forEach((a) => {
          let weeklyHours = 0;

          if (a.class) {
            // Check Class Contract
            if (a.class.contracts && a.class.contracts.length > 0) {
              weeklyHours = Number(a.class.contracts[0].weeklyHours);
            } else {
              // Fallback to legacy field
              weeklyHours = Number(a.class.weeklyHours || 0);
            }
          } else if (a.student) {
            // Check Student Contract (Private Classes)
            if (a.student.contracts && a.student.contracts.length > 0) {
              weeklyHours = Number(a.student.contracts[0].weeklyHours);
            }
          }

          monthlyExpectedHours += weeklyHours * 4;
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
        isTeacher:
          customFields.teacher === true || customFields.teacher === 'true',
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

    // 5. Auto-Heal: Update names for "Sincronizado" users
    // run in background to not block response
    (async () => {
      const usersToUpdate = mergedUsers.filter(
        (u) =>
          u.dbId &&
          u.name &&
          u.name !== 'Sem Nome' &&
          dbUsers?.find((dbU) => dbU.id === u.dbId)?.name ===
            'Usuário (Sincronizado)'
      );

      if (usersToUpdate.length > 0) {
        console.log(
          `[AutoHeal] Updating ${usersToUpdate.length} user names...`
        );
        for (const u of usersToUpdate) {
          try {
            await prisma.user.update({
              where: { id: u.dbId },
              data: { name: u.name },
            });
          } catch (err) {
            console.error(`[AutoHeal] Failed to update user ${u.email}`, err);
          }
        }
      }
    })();

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
