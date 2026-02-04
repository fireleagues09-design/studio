'use client';

import { Flame } from 'lucide-react';
import { useLoading } from '@/context/LoadingContext';
import { cn } from '@/lib/utils';

export function FullScreenLoader() {
  const { isLoading } = useLoading();

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300',
        isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <Flame className="h-16 w-16 animate-pulse-fire text-primary" />
    </div>
  );
}
