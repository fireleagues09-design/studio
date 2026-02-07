'use client';

import { useLoading } from '@/context/LoadingContext';
import { cn } from '@/lib/utils';

export function FullScreenLoader() {
  const { isLoading } = useLoading();

  // The path data for the Lucide 'Flame' icon
  const flamePath = "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z";

  return (
    <div
      className={cn(
        'fire-loader',
        'transition-opacity duration-500',
        isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <div className="loader">
        <div className="line left"></div>
        <div className="line right"></div>
        <div className="spark"></div>
        <svg viewBox="0 0 24 24" className="logo">
          <path d={flamePath} fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
