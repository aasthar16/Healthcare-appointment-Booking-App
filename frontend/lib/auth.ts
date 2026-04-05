import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios, { AxiosError } from 'axios';

// This must be the direct backend URL, not the Next.js proxy,
// because this code runs server-side inside the NextAuth handler.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      // These keys must match exactly what the login form sends.
      // The name= attribute on each input maps to these keys.
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        console.log(credentials?.email , credentials?.password);
        // console.log(!credentials?.password , !credentials?.password);
        if (!credentials?.email || !credentials?.password) {
          console.error('[auth] authorize called with missing credentials');
          return null;
        }

        const email    = credentials.email.trim().toLowerCase();
        const password = credentials.password.trim();

        try {
          console.log(`[auth] attempting login for: ${email}`);

          const { data } = await axios.post(
            `http://localhost:4000/api/auth/login`,
            { email, password },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 10_000,
            },
          );

          if (!data?.accessToken) {
            console.error('[auth] backend returned no accessToken:', data);
            return null;
          }

          const payloadBase64 = data.accessToken.split('.')[1];
          const payload = JSON.parse(
            Buffer.from(payloadBase64, 'base64url').toString('utf8'),
          );

          console.log(`[auth] login success for userId: ${payload.sub}`);

          // Return the user object with all necessary fields
          // This is the only place we need to modify - add email to the returned user
          return {
            id:          payload.sub as string,
            email:       email,  // Already present, keep it
            role:        data.role,
            accessToken: data.accessToken,
          };
        } catch (err) {
          const axiosErr = err as AxiosError<{ message: string | string[] }>;
          const msg = axiosErr.response?.data?.message;
          console.error(
            '[auth] login failed:',
            Array.isArray(msg) ? msg.join(', ') : (msg ?? axiosErr.message),
          );
          // Returning null triggers the CredentialsSignin error in NextAuth.
          // Do NOT throw here — throwing causes a 500, not a clean auth error.
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    // Session is valid for 7 days
    maxAge: 7 * 24 * 60 * 60,
  },

  callbacks: {
    // Called when JWT is created (sign in) and on every request.
    // `user` is only defined on the very first call after sign in.
    async jwt({ token, user }) {
      if (user) {
        token.userId      = user.id;
        token.email       = user.email;  // ✅ ADD THIS - stores email in JWT (safe addition)
        token.role        = (user as any).role;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },

    async session({ session, token }) {
      // ✅ ADD THESE LINES - preserve existing functionality
      session.accessToken  = token.accessToken as string;
      session.user.id      = token.userId      as string;
      session.user.email   = token.email       as string;  // ✅ ADD THIS - sets email in session
      session.user.role    = token.role        as any;
      
      // Keep existing name if needed
      if (!session.user.name && token.email) {
        session.user.name = (token.email as string).split('@')[0];
      }
      
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',   
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === 'development',
};