export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    // Protect these routes
    '/dashboard/:path*',
    '/profile/:path*',
    '/appointments/:path*',
    '/doctors/:path*',

    '/((?!_next/static|_next/image|favicon.ico|login|register|api/auth|api/backend).*)',
  ],
};