
'use client';

import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const EMOJIS = ['🎁', '💖'];

const BestiePage = () => {
  const [particles, setParticles] = useState<{ id: number; content: string | null; x: number; delay: number; duration: number; type: 'emoji' | 'snow' }[]>([]);
  const [interactionStep, setInteractionStep] = useState(0);

  useEffect(() => {
    const generateParticles = () => {
      // More snow, less emojis
      const newParticles = Array.from({ length: 100 }).map((_, i) => {
        const isEmoji = Math.random() > 0.9; // ~10% chance of being an emoji
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
    setInteractionStep(prev => {
        if (prev === 0) return 1;
        if (prev === 2) return 3;
        return prev;
    });
  };

  const handleContinueClick = () => {
    setInteractionStep(2);
  };

  const renderContent = () => {
    let title = '';
    let buttons = null;

    switch (interactionStep) {
      case 1:
        title = 'whyyyyyy ???';
        buttons = (
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                <Button size="lg" onClick={handleContinueClick}>Continue</Button>
            </div>
        );
        break;
      case 2:
      case 3: // Same title for step 3
        title = 'You must have to playyyyyy and click yesss only!!!!!! or if you click no button then i will remove the no button';
        buttons = (
            <div className="flex gap-4 justify-center animate-in fade-in slide-in-from-bottom-5 duration-500">
              <Button size="lg">Yes</Button>
              {interactionStep === 2 && (
                <Button size="lg" variant="outline" onClick={handleNoClick}>No</Button>
              )}
            </div>
        );
        break;
      case 0:
      default:
        title = 'Hey wanna play a game';
        buttons = (
            <div className="flex gap-4 justify-center animate-in fade-in slide-in-from-bottom-5 duration-500">
              <Button size="lg">Yes</Button>
              <Button size="lg" variant="outline" onClick={handleNoClick}>No</Button>
            </div>
        );
        break;
    }

    return {
        titleContent: (
            <h1 key={interactionStep} className="text-4xl font-bold text-primary mb-6 animate-in fade-in zoom-in-95 duration-500">
                {title}
            </h1>
        ),
        buttonsContent: (
            <div key={`${interactionStep}-buttons`} className="min-h-[44px]">
                {buttons}
            </div>
        )
    }
  };

  const { titleContent, buttonsContent } = renderContent();


  return (
    <div className="fixed inset-0 z-[9999] bg-[#fff0f3] dark:bg-pink-950 overflow-hidden">
      <div className="falling-emojis">
        {particles.map(({ id, content, x, delay, duration, type }) => (
          <span
            key={id}
            className={type === 'emoji' ? 'emoji' : 'snowflake'}
            style={{
              left: `${x}vw`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              fontSize: '0.8rem',
            }}
          >
            {content}
          </span>
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
        <div className="text-center p-8 bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-2xl shadow-lg max-w-md">
          {titleContent}
          {buttonsContent}
        </div>
      </div>
    </div>
  );
};

export default BestiePage;
