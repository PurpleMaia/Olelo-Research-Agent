'use client';

import { LoginForm } from '../../../components/auth/LoginForm';
import { SystemRole } from '@/types/db';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as SystemRole | null;
  const loginType = type === 'sysadmin' ? 'sysadmin' : 'user';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <LoginForm loginType={loginType} />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
