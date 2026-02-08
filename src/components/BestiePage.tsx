
'use client';

import { Button } from '@/components/ui/button';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Hand } from 'lucide-react';

const EMOJIS = ['🎁', '💖'];

const BestiePage = () => {
  const [particles, setParticles] = useState<{ id: number; content: string | null; x: number; delay: number; duration: number; type: 'emoji' | 'snow' }[]>([]);
  const [step, setStep] = useState('initial'); // 'initial', 'why', 'must_play', 'help', 'chase', 'caught', 'final'
  
  // States for 'why' step
  const [showContinueAnimation, setShowContinueAnimation] = useState(false);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const animationEndedRef = useRef(false);

  // States for 'must_play' (teleport) step
  const [noHoverCount, setNoHoverCount] = useState(0);
  const [noButtonPos, setNoButtonPos] = useState<React.CSSProperties>({});
  
  // States for 'chase' step
  const [runawayPos, setRunawayPos] = useState<React.CSSProperties>({ top: '50%', left: '50%', position: 'absolute', opacity: 0 });
  const [handsPos, setHandsPos] = useState({
    left: { top: '50%', left: '10%', opacity: 0, transition: 'opacity 0.5s ease-in-out' },
    right: { top: '50%', left: '90%', opacity: 0, transition: 'opacity 0.5s ease-in-out' },
  });
  const [showCatchMessage, setShowCatchMessage] = useState(false);


  // State for 'final' step
  const [showFinalFall, setShowFinalFall] = useState(false);

  // Timer/Interval refs
  const catchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chaseActiveRef = useRef(false);
  const chasePathIndexRef = useRef(0);
  const noButtonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 150 }).map((_, i) => {
        const isEmoji = Math.random() > 0.9; 
        return {
          id: i,
          content: isEmoji ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : null,
          type: isEmoji ? 'emoji' : 'snow',
          x: Math.random() * 100,
          delay: Math.random() * 15,
          duration: Math.random() * 7 + 8,
        };
      });
      setParticles(newParticles);
    };
    generateParticles();
  }, []);

  // Effect for 'why' step animation
  useEffect(() => {
    if (step === 'why') {
      const timer = setTimeout(() => {
        setShowContinueAnimation(true);
        animationEndedRef.current = false;
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowContinueAnimation(false);
      setShowContinueButton(false);
    }
  }, [step]);
  
  // Effect for 'chase' step animation
  useEffect(() => {
    if (step === 'chase') {
      chaseActiveRef.current = true;
      setShowCatchMessage(false);
      chasePathIndexRef.current = 0;

      // Hands appear from the side
      setHandsPos({
        left: { top: '50%', left: '10%', opacity: 1, transition: 'opacity 0.5s' },
        right: { top: '50%', left: '90%', opacity: 1, transition: 'opacity 0.5s' },
      });
      
      const runChaseSequence = () => {
        if (!chaseActiveRef.current) return;

        // 1. Button jumps to a new random, far position by alternating quadrants
        const quadrant = chasePathIndexRef.current % 4;
        let topRange: [number, number], leftRange: [number, number];

        switch(quadrant) {
            case 0: // Top-left
                topRange = [15, 40];
                leftRange = [15, 40];
                break;
            case 1: // Bottom-right
                topRange = [60, 85];
                leftRange = [60, 85];
                break;
            case 2: // Top-right
                topRange = [15, 40];
                leftRange = [60, 85];
                break;
            case 3: // Bottom-left
            default: // Fallback
                topRange = [60, 85];
                leftRange = [15, 40];
                break;
        }

        const newTop = `${topRange[0] + Math.random() * (topRange[1] - topRange[0])}%`;
        const newLeft = `${leftRange[0] + Math.random() * (leftRange[1] - leftRange[0])}%`;
        
        const nextButtonPos = { top: newTop, left: newLeft };
        chasePathIndexRef.current += 1;

        setRunawayPos({
            position: 'absolute',
            opacity: 1,
            top: nextButtonPos.top,
            left: nextButtonPos.left,
            transform: 'translate(-50%, -50%)',
            transition: 'top 0.2s ease-out, left 0.2s ease-out',
        });

        // 2. After a short delay, hands start moving to catch it
        setTimeout(() => {
          if (!chaseActiveRef.current) return;
          setHandsPos({
            left: { top: nextButtonPos.top, left: `calc(${nextButtonPos.left} - 4rem)`, opacity: 1, transition: 'top 0.8s ease-in, left 0.8s ease-in' },
            right: { top: nextButtonPos.top, left: `calc(${nextButtonPos.left} + 4rem)`, opacity: 1, transition: 'top 0.8s ease-in, left 0.8s ease-in' },
          });
        }, 300);
      };

      // Run the sequence every 1.5 seconds
      const sequenceInterval = setInterval(runChaseSequence, 1500);
      runChaseSequence(); // Run it once immediately

      // After 10 seconds, stop the chase and go to 'caught' state
      catchTimeoutRef.current = setTimeout(() => {
          clearInterval(sequenceInterval);
          chaseActiveRef.current = false;
          setStep('caught');
      }, 10000);

      return () => {
        clearInterval(sequenceInterval);
        chaseActiveRef.current = false;
        if (catchTimeoutRef.current) clearTimeout(catchTimeoutRef.current);
      }
    }
  }, [step]);
  
  // Effect for 'caught' state
  useEffect(() => {
    if (step === 'caught') {
      // Lock hands to the final button position
      const top = runawayPos.top as string;
      const left = runawayPos.left as string;
      setHandsPos({
        left: { top: top, left: `calc(${left} - 4rem)`, opacity: 1, transition: 'top 0.3s ease-out, left 0.3s ease-out' },
        right: { top: top, left: `calc(${left} + 4rem)`, opacity: 1, transition: 'top 0.3s ease-out, left 0.3s ease-out' },
      });
      // Show catch message
      const messageTimer = setTimeout(() => setShowCatchMessage(true), 400);
      return () => clearTimeout(messageTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);


  // Effect for final fall
  useEffect(() => {
    if (step === 'final') {
        const timer = setTimeout(() => setShowFinalFall(true), 9000);
        return () => clearTimeout(timer);
    }
  }, [step]);

  const handleBallAnimationEnd = () => {
    if (!animationEndedRef.current) {
        animationEndedRef.current = true;
        setTimeout(() => setShowContinueButton(true), 0);
    }
  };

  const handleNoHover = () => {
    if (step === 'must_play') {
      if (noHoverCount >= 6) {
        setStep('help');
        setNoButtonPos({}); // Reset position
        return;
      }
      
      setNoHoverCount(c => c + 1);
      
      if (!cardRef.current || !noButtonRef.current) return;

      const cardRect = cardRef.current.getBoundingClientRect();
      const buttonRect = noButtonRef.current.getBoundingClientRect();

      const newPos: React.CSSProperties = {
          position: 'absolute',
          top: `${Math.random() * (cardRect.height - buttonRect.height)}px`,
          left: `${Math.random() * (cardRect.width - buttonRect.width)}px`,
          transition: 'top 0.3s ease-out, left 0.3s ease-out',
      };
      
      setNoButtonPos(newPos);
    }
  };

  const handleNoClick = () => {
    if (step === 'initial') {
      setStep('why');
    }
  };

  const renderContent = () => {
    let title: React.ReactNode = '';
    let buttons: React.ReactNode = null;

    switch (step) {
      case 'initial':
        title = 'Hey wanna play a game ??';
        buttons = (
          <div className="flex gap-4 justify-center animate-in fade-in slide-in-from-bottom-5 duration-500">
            <Button size="lg">Yes</Button>
            <Button size="lg" variant="outline" onClick={handleNoClick}>No</Button>
          </div>
        );
        break;
      
      case 'why':
        title = 'whyyyyyy ???';
        buttons = (
          <div className="relative flex h-[44px] items-center justify-center">
            {showContinueAnimation && !showContinueButton && (
              <>
                <div
                  onAnimationEnd={handleBallAnimationEnd}
                  className="absolute h-4 w-4 rounded-full bg-primary"
                  style={{ animation: 'snake-left-to-center 1.2s ease-in-out forwards' }}
                />
                <div
                  onAnimationEnd={handleBallAnimationEnd}
                  className="absolute h-4 w-4 rounded-full bg-primary"
                  style={{ animation: 'snake-right-to-center 1.2s ease-in-out forwards' }}
                />
              </>
            )}
            {showContinueButton && (
              <div style={{ animation: 'continue-button-appear 0.4s ease-out forwards' }}>
                <Button size="lg" onClick={() => setStep('must_play')}>Continue</Button>
              </div>
            )}
          </div>
        );
        break;

      case 'must_play':
        title = 'You must have to playyyyyy and click yesss only!!!!!! or if you click no button then i will remove the no button';
        buttons = (
          <div className="relative h-11 w-full flex justify-center items-center gap-4">
            <Button size="lg" className="animate-in fade-in slide-in-from-bottom-5 duration-500">Yes</Button>
            <Button
              ref={noButtonRef}
              size="lg"
              variant="outline"
              onClick={handleNoClick}
              onMouseEnter={handleNoHover}
              style={noButtonPos}
              className={cn("animate-in fade-in slide-in-from-bottom-5 duration-500", noButtonPos.position === 'absolute' && 'z-50')}
            >
              No
            </Button>
          </div>
        );
        break;

      case 'help':
        buttons = (
            <div className="flex gap-4 justify-center animate-in fade-in slide-in-from-bottom-5 duration-500">
                <Button size="lg" onClick={() => setStep('chase')}>Help</Button>
            </div>
        );
        break;

      case 'chase':
      case 'caught':
        title = step === 'chase' 
            ? 'You must have to playyyyyy and click yesss only!!!!!! or if you click no button then i will remove the no button'
            : ' ';
        buttons = (
            <div className="relative flex-grow flex justify-center items-center">
                <Button size="lg" style={{ position: 'absolute', top: '80%', left: '50%', transform: 'translate(-120%, -50%)' }}>Yes</Button>
                
                <Hand className="absolute w-12 h-12 text-primary/70 drop-shadow-lg" style={{...handsPos.left, transform: 'scaleX(-1) rotate(-30deg) translate(50%, -50%)'}} />
                <Hand className="absolute w-12 h-12 text-primary/70 drop-shadow-lg" style={{...handsPos.right, transform: 'rotate(30deg) translate(-50%, -50%)'}} />

                <Button
                    id="runaway-no-button"
                    size="lg"
                    variant="outline"
                    onClick={() => { if (step === 'caught') setStep('final'); }}
                    style={runawayPos}
                    disabled={step === 'chase'}
                >
                    No
                </Button>
                 {showCatchMessage && (
                    <div 
                        className="absolute text-xs bg-background/80 text-foreground px-2 py-1 rounded-md shadow-lg"
                        style={{
                            top: `calc(${runawayPos.top} - 4.5rem)`, 
                            left: runawayPos.left,
                            transform: 'translateX(-50%)',
                            animation: 'continue-button-appear 0.5s ease-out forwards'
                        }}
                    >
                        yayy i catched it
                    </div>
                )}
            </div>
        );
        break;
      
      case 'final':
        title = "Oh dear i did said you that i will remove that button if you try to press it.... so now just go on press Yes button which gonna fall down from the sky just for you"
        buttons = (
            <div className="relative h-11">
                {showFinalFall && (
                    <Button size="lg" style={{ animation: 'fall-with-wind 15s ease-out forwards' }}>
                        Yes
                    </Button>
                )}
            </div>
        )
        break;
    }

    return (
      <div ref={cardRef} className="relative text-center p-8 bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl shadow-lg min-h-[160px] w-full max-w-md flex flex-col justify-between">
        {title && <h1 key={step} className="text-xl md:text-2xl font-bold text-primary mb-6 animate-in fade-in zoom-in-95 duration-500">
          {title}
        </h1>}
        <div className="relative flex-grow">
          {buttons}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-pink-100 dark:bg-pink-950/95 backdrop-blur-sm overflow-hidden">
      <div className="falling-emojis">
        {particles.map(({ id, content, x, delay, duration, type }) => (
          <span
            key={id}
            className={cn(type === 'emoji' ? 'emoji' : 'snowflake')}
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
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full p-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default BestiePage;
