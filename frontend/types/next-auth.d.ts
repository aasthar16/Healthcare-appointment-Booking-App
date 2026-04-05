import type { DefaultSession, DefaultUser } from 'next-auth';
import type { JWT as DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    user: {
      id: string;
      role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
      email: string;  // Make sure email is required in session
      name?: string | null;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
    accessToken: string;
    email: string;  // Make sure email is required
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
    accessToken: string;
    userId: string;
    email: string;  // Add email to JWT
  }
}