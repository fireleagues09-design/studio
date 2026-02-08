'use client';

import { useState, useEffect, useRef, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLoading } from '@/context/LoadingContext';

export function FloatingHomeButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { showLoader } = useLoading();
  
  const buttonRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const positionRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const startDragPosRef = useRef({ x: 0, y: 0 }); // To correctly calculate movement

  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (buttonRef.current) {
        // Adjust initial X position to be further from the edge
        const initialX = window.innerWidth - buttonRef.current.offsetWidth - 40;
        const initialY = window.innerHeight - buttonRef.current.offsetHeight - 80;
        positionRef.current = { x: initialX, y: initialY };
        buttonRef.current.style.transform = `translate(${initialX}px, ${initialY}px)`;
    }
    
    setIsVisible(pathname !== '/');

    const handleResize = () => {
        if (!buttonRef.current) return;
        const { offsetWidth, offsetHeight } = buttonRef.current;
        const newX = Math.max(16, Math.min(positionRef.current.x, window.innerWidth - offsetWidth - 16));
        const newY = Math.max(16, Math.min(positionRef.current.y, window.innerHeight - offsetHeight - 16));
        positionRef.current = { x: newX, y: newY };
        buttonRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);

  }, [pathname, isMounted]);

  const handleDragStart = (clientX: number, clientY: number) => {
    if (!buttonRef.current) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    buttonRef.current.classList.add('grabbing');
    
    startDragPosRef.current = { x: clientX, y: clientY };

    const rect = buttonRef.current.getBoundingClientRect();
    offsetRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchUp);
  };
  
  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current || !buttonRef.current) return;
    
    // Make drag follow instantly and reliably differentiate from a click.
    if (!hasMovedRef.current) {
      const dx = clientX - startDragPosRef.current.x;
      const dy = clientY - startDragPosRef.current.y;
      // Use a very small threshold to distinguish a click from an intentional drag.
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          hasMovedRef.current = true;
      }
    }

    const { offsetWidth, offsetHeight } = buttonRef.current;
    
    let newX = clientX - offsetRef.current.x;
    let newY = clientY - offsetRef.current.y;
    
    newX = Math.max(16, Math.min(newX, window.innerWidth - offsetWidth - 16));
    newY = Math.max(16, Math.min(newY, window.innerHeight - offsetHeight - 16));

    positionRef.current = { x: newX, y: newY };
    buttonRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
  };

  const handleDragEnd = () => {
    // If there was no significant movement, treat it as a click.
    if (!hasMovedRef.current) {
        if (pathname !== '/') {
            showLoader();
            router.push('/');
        }
    }
    isDraggingRef.current = false;
    if (buttonRef.current) {
        buttonRef.current.classList.remove('grabbing');
    }
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchUp);
  };

  const handleMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: ReactTouchEvent) => {
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleMouseMove = (e: MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };
  const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleMouseUp = () => handleDragEnd();
  const handleTouchUp = () => handleDragEnd();

  if (!isMounted) {
    return null;
  }

  return (
    <div
      ref={buttonRef}
      className={cn(
        'fixed top-0 left-0 z-50 w-12 h-12 rounded-full bg-accent shadow-lg flex items-center justify-center cursor-grab transition-all duration-300',
        'hover:shadow-accent/40 hover:shadow-[0_0_15px_5px_hsl(var(--accent))]',
        'active:cursor-grabbing active:scale-105 active:bg-primary active:shadow-primary/40 active:shadow-[0_0_15px_5px_hsl(var(--primary))]',
        'grabbing:cursor-grabbing grabbing:scale-105 grabbing:bg-primary grabbing:shadow-primary/40 grabbing:shadow-[0_0_15px_5px_hsl(var(--primary))]',
        isVisible ? 'opacity-90 hover:opacity-100' : 'opacity-0 pointer-events-none'
      )}
      style={{ touchAction: 'none' }} 
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="w-full h-full flex items-center justify-center">
        <Home className="h-5 w-5 text-white" />
      </div>
    </div>
  );
}
