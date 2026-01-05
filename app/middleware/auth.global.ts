export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser();

  // List of routes that don't require authentication
  const publicRoutes = ['/login', '/confirm'];

  if (!user.value && !publicRoutes.includes(to.path)) {
    return navigateTo('/login');
  }

  if (user.value && to.path === '/login') {
    return navigateTo('/');
  }
});
