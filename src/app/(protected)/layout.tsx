'use client';
import { useUser } from '@/firebase';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isUserLoading && !user) {
      redirect('/login');
    }
  }, [user, isUserLoading, isMounted]);

  // On the initial server render and first client render, return null if loading.
  if (!isMounted || isUserLoading) {
    // Only render the loading indicator on the client after mounting.
    if (!isMounted) {
      return null;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying your session...</p>
      </div>
    );
  }

  // After loading and mounting, if there's no user, redirecting will happen via useEffect.
  // Rendering null here prevents a flash of content before the redirect is complete.
  if (!user) {
    return null;
  }

  // If we have a user and we are mounted, show the content.
  return <>{children}</>;
}
