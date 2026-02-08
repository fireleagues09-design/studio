'use client';

import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const EMOJIS = ['🎁', '💖'];

const BestiePage = () => {
  const [particles, setParticles] = useState<{ id: number; content: string | null; x: number; delay: number; duration: number; type: 'emoji' | 'snow' }[]>([]);
  const [interactionStep, setInteractionStep] = useState(0);
  const [showButtons, setShowButtons] = useState(true);

  useEffect(() => {
    const generateParticles = () => {
      // Generate 50 particles total, with a higher chance of being snow
      const newParticles = Array.from({ length: 50 }).map((_, i) => {
        const isEmoji = Math.random() > 0.8; // ~20% chance of being an emoji
        return {
          id: i,
          content: isEmoji ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : null,
          type: isEmoji ? 'emoji' : 'snow',
          x: Math.random() * 100, // percentage
          delay: Math.random() * 15, // seconds
          duration: Math.random() * 7 + 8, // seconds (8 to 15s)
        };
      });
      setParticles(newParticles);
    };

    generateParticles();
  }, []);

  const handleNoClick = () => {
    if (interactionStep === 0) {
      setInteractionStep(1);
    } else if (interactionStep === 2) {
      setInteractionStep(3);
    }
  };

  const handleContinueClick = () => {
    setShowButtons(false);
    setInteractionStep(2);
    setTimeout(() => {
      setShowButtons(true);
    }, 100); // Small delay to trigger transition
  };

  const renderContent = () => {
    switch (interactionStep) {
      case 1:
        return {
          title: 'whyyyyyy ???',
          buttons: <Button size="lg" onClick={handleContinueClick}>Continue</Button>
        };
      case 2:
      case 3: // Same title for step 3
        return {
          title: 'You must have to playyyyyy and click yesss only or if you click no button then i will remove the no nutton',
          buttons: (
            <div className={cn(
              "flex gap-4 justify-center transition-opacity duration-500",
              showButtons ? "opacity-100" : "opacity-0"
            )}>
              <Button size="lg">Yes</Button>
              {interactionStep === 2 && (
                <Button size="lg" variant="outline" onClick={handleNoClick}>No</Button>
              )}
            </div>
          )
        };
      case 0:
      default:
        return {
          title: 'Hey wanna play a game',
          buttons: (
            <div className="flex gap-4 justify-center">
              <Button size="lg">Yes</Button>
              <Button size="lg" variant="outline" onClick={handleNoClick}>No</Button>
            </div>
          )
        };
    }
  };

  const { title, buttons } = renderContent();


  return (
    <div className="fixed inset-0 z-[9999] bg-[#fff0f3] dark:bg-pink-950/95 overflow-hidden">
      <div className="falling-emojis">
        {particles.map(({ id, content, x, delay, duration, type }) => (
          <span
            key={id}
            className={type === 'emoji' ? 'emoji text-base' : 'snowflake'}
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
        <div className="text-center p-8 bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-2xl shadow-lg max-w-md">
          <h1 className="text-4xl font-bold text-primary mb-6">
            {title}
          </h1>
          <div className="min-h-[44px]">
            {buttons}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BestiePage;
