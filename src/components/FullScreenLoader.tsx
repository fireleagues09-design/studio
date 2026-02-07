
'use client';

import { useLoading } from '@/context/LoadingContext';
import { cn } from '@/lib/utils';
import { Flame } from 'lucide-react';

export function FullScreenLoader() {
  const { isLoading } = useLoading();

  return (
    <div
      className={cn(
        'fire-loader',
        'transition-opacity duration-500',
        isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <div className="flame flame1"></div>
      <div className="flame flame2"></div>
      <div className="flame flame3"></div>
      {/* The Flame icon from lucide-react is used as the logo */}
      <Flame className="fire-loader-logo" />
    </div>
  );
}
