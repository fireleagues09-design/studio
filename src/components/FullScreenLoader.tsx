
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
      <svg viewBox="0 0 24 24" className="fire-svg" style={{ width: '250px', height: '250px' }}>
        <defs>
          <mask id="logoMask">
            <path d={flamePath} fill="white" />
          </mask>
          <linearGradient id="fireGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ff0000" />
            <stop offset="40%" stopColor="#ff6a00" />
            <stop offset="70%" stopColor="#ffd000" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="24" height="48"
              fill="url(#fireGrad)"
              mask="url(#logoMask)"
              className="fire-fill" />

        <path d={flamePath} fill="none" className="glow" />
      </svg>
    </div>
  );
}
