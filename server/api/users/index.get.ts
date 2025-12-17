export default defineEventHandler(async (event) => {
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
  });
  return users;
});
