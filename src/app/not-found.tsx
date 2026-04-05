'use client';

import { useEffect } from 'react';
import { useLoading } from '@/context/LoadingContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Flame } from 'lucide-react';

export default function NotFound() {
  const { hideLoader } = useLoading();

  useEffect(() => {
    // Ensure the loader is hidden when a 404 page is reached
    hideLoader();
  }, [hideLoader]);

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[70vh] px-4 text-center space-y-6">
      <div className="p-6 bg-primary/10 rounded-full">
        <Flame className="h-16 w-16 text-primary animate-pulse" />
      </div>
      <div className="space-y-2">
        <h1 className="text-6xl font-black tracking-tighter">404</h1>
        <h2 className="text-2xl font-bold">Lobby Not Found</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved to a different arena.
        </p>
      </div>
      <Button asChild size="lg" className="rounded-full font-bold px-8">
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  );
}
