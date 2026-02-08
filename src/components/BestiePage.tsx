'use client';

import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

const EMOJIS = ['🎁', '💖'];

const BestiePage = () => {
  const [particles, setParticles] = useState<{ id: number; content: string | null; x: number; delay: number; duration: number; type: 'emoji' | 'snow' }[]>([]);

  useEffect(() => {
    const generateParticles = () => {
      // Generate 20 particles total (a mix of emojis and snow)
      const newParticles = Array.from({ length: 20 }).map((_, i) => {
        const isEmoji = Math.random() > 0.5;
        return {
          id: i,
          content: isEmoji ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : null,
          type: isEmoji ? 'emoji' : 'snow',
          x: Math.random() * 100, // percentage
          delay: Math.random() * 10, // seconds
          duration: Math.random() * 5 + 8, // seconds (8 to 13s)
        };
      });
      setParticles(newParticles);
    };

    generateParticles();
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#fff0f3] dark:bg-pink-950/30 overflow-hidden">
      <div className="falling-emojis">
        {particles.map(({ id, content, x, delay, duration, type }) => (
          <span
            key={id}
            className={type === 'emoji' ? 'emoji' : 'snowflake'}
            style={{
              left: `${x}vw`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          >
            {content}
          </span>
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
        <div className="text-center p-8 bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-2xl shadow-lg">
          <h1 className="text-4xl font-bold text-primary mb-6">
            Hey wanna play a game
          </h1>
          <div className="flex gap-4 justify-center">
            <Button size="lg">
              Yes
            </Button>
            <Button size="lg" variant="outline">
              No
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BestiePage;
