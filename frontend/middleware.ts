import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/appointments/:path*",
    "/doctors/:path*",
    "/((?!_next/static|_next/image|favicon.ico|login|register|api/auth|api/backend).*)",
  ],
};