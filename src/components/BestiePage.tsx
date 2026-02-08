'use client';

import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

const EMOJIS = ['🎁', '💖', '✨', '💝', '🎉', '💌'];

const BestiePage = () => {
  const [emojis, setEmojis] = useState<{ id: number; emoji: string; x: number; delay: number; duration: number; }[]>([]);

  useEffect(() => {
    const generateEmojis = () => {
      const newEmojis = Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        x: Math.random() * 100, // percentage
        delay: Math.random() * 10, // seconds
        duration: Math.random() * 5 + 5, // seconds (5 to 10s)
      }));
      setEmojis(newEmojis);
    };

    generateEmojis();
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#fff0f3] dark:bg-pink-950/30 overflow-hidden">
      <div className="falling-emojis">
        {emojis.map(({ id, emoji, x, delay, duration }) => (
          <span
            key={id}
            className="emoji"
            style={{
              left: `${x}vw`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          >
            {emoji}
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
