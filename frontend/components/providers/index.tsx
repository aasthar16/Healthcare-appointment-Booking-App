'use client';

import type { Session } from 'next-auth';
import { AuthProvider } from './auth-provider';
import { QueryProvider } from './query-provider';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: React.ReactNode;
  session:  Session | null;
}

export function Providers({ children, session }: ProvidersProps) {
  return (
    <AuthProvider session={session}>
      <QueryProvider>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </QueryProvider>
    </AuthProvider>
  );
}