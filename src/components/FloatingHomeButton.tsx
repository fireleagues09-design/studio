
'use client';

import { useState, useEffect, useRef, MouseEvent, TouchEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FloatingHomeButton() {
  const pathname = usePathname();
  // Initialize position state without window object
  const [position, setPosition] = useState({ x: 20, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Set initial position only after component has mounted on the client
    setPosition({ x: 20, y: window.innerHeight - 80 });
  }, []);

  useEffect(() => {
    // Only show the button if not on the homepage
    setIsVisible(pathname !== '/');

    const handleResize = () => {
        if (!buttonRef.current) return;
        const buttonWidth = buttonRef.current.offsetWidth;
        const buttonHeight = buttonRef.current.offsetHeight;
        // Adjust position on resize to keep it within bounds
        setPosition(prev => ({
            x: Math.min(prev.x, window.innerWidth - buttonWidth),
            y: Math.min(prev.y, window.innerHeight - buttonHeight)
        }));
    };

    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
    }
  }, [pathname]);

  const handleMouseDown = (e: MouseEvent) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setIsDragging(true);
    }
  };
  
  const handleTouchStart = (e: TouchEvent) => {
    if (buttonRef.current) {
        const touch = e.touches[0];
        const rect = buttonRef.current.getBoundingClientRect();
        setOffset({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
        setIsDragging(true);
    }
  };

  const handleMouseMove = (e: globalThis.MouseEvent) => {
    if (isDragging && buttonRef.current) {
      const buttonWidth = buttonRef.current.offsetWidth;
      const buttonHeight = buttonRef.current.offsetHeight;
      let newX = e.clientX - offset.x;
      let newY = e.clientY - offset.y;
      
      // Boundary checks
      newX = Math.max(0, Math.min(newX, window.innerWidth - buttonWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - buttonHeight));

      setPosition({ x: newX, y: newY });
    }
  };

  const handleTouchMove = (e: globalThis.TouchEvent) => {
    if (isDragging && buttonRef.current) {
        const touch = e.touches[0];
        const buttonWidth = buttonRef.current.offsetWidth;
        const buttonHeight = buttonRef.current.offsetHeight;
        let newX = touch.clientX - offset.x;
        let newY = touch.clientY - offset.y;
        
        newX = Math.max(0, Math.min(newX, window.innerWidth - buttonWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - buttonHeight));

        setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setTimeout(() => setIsDragging(false), 50);
  };
  
  const handleTouchEnd = () => {
    setTimeout(() => setIsDragging(false), 50);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, offset]);


  if (!isVisible || !isMounted) {
    return null;
  }

  return (
    <div
      ref={buttonRef}
      className={cn(
        'fixed z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center cursor-grab transition-all duration-300',
        'hover:shadow-primary/40 hover:shadow-[0_0_15px_5px_hsl(var(--primary))]',
        isDragging && 'cursor-grabbing scale-105 shadow-primary/40 shadow-[0_0_15px_5px_hsl(var(--primary))]',
        isVisible ? 'opacity-90 hover:opacity-100' : 'opacity-0 pointer-events-none'
      )}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <Link href="/" className="w-full h-full flex items-center justify-center" draggable="false" onClick={(e) => isDragging && e.preventDefault()}>
        <Home className="h-5 w-5" />
      </Link>
    </div>
  );
}
