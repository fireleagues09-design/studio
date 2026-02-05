
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
      <svg viewBox="0 0 300 300" className="fire-svg" style={{width: '250px', height: '250px'}}>
        <defs>
          <filter id="fire">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise">
              <animate attributeName="baseFrequency"
                values="0.02;0.04;0.02"
                dur="2s"
                repeatCount="indefinite"/>
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="25"/>
          </filter>
          <linearGradient id="flameGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ff0000"/>
            <stop offset="40%" stopColor="#ff6a00"/>
            <stop offset="75%" stopColor="#ffd000"/>
            <stop offset="100%" stopColor="#ffffff"/>
          </linearGradient>
        </defs>

        <Flame
          width="220"
          height="220"
          x="40"
          y="40"
          filter="url(#fire)"
          className="logo-fire"
          fill="white"
          stroke="none"
        />

        <rect width="300" height="300"
          fill="url(#flameGradient)"
          className="flame-overlay"/>
      </svg>
    </div>
  );
}
