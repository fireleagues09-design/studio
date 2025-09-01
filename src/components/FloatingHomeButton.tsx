
'use client';

import { useState, useEffect, useRef, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FloatingHomeButton() {
  const pathname = usePathname();
  const router = useRouter();
  
  const buttonRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const positionRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });

  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);


  useEffect(() => {
    setIsMounted(true);
    if (buttonRef.current) {
        const initialX = window.innerWidth - 80;
        const initialY = window.innerHeight - 80;
        positionRef.current = { x: initialX, y: initialY };
        buttonRef.current.style.transform = `translate(${initialX}px, ${initialY}px)`;
    }
  }, []);

  useEffect(() => {
    setIsVisible(pathname !== '/');

    const handleResize = () => {
        if (!buttonRef.current) return;
        const { offsetWidth, offsetHeight } = buttonRef.current;
        const newX = Math.min(positionRef.current.x, window.innerWidth - offsetWidth - 16);
        const newY = Math.min(positionRef.current.y, window.innerHeight - offsetHeight - 16);
        positionRef.current = { x: newX, y: newY };
        buttonRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pathname]);


  const handleDragStart = (clientX: number, clientY: number) => {
    if (!buttonRef.current) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    setIsInteracting(true);
    
    const rect = buttonRef.current.getBoundingClientRect();
    offsetRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchUp);
  };
  
  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current || !buttonRef.current) return;
    hasMovedRef.current = true;

    const { offsetWidth, offsetHeight } = buttonRef.current;
    
    let newX = clientX - offsetRef.current.x;
    let newY = clientY - offsetRef.current.y;
    
    // Boundary checks (with a 16px margin)
    newX = Math.max(16, Math.min(newX, window.innerWidth - offsetWidth - 16));
    newY = Math.max(16, Math.min(newY, window.innerHeight - offsetHeight - 16));

    positionRef.current = { x: newX, y: newY };
    buttonRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
  };

  const handleDragEnd = () => {
    if (!hasMovedRef.current) {
        router.push('/');
    }
    isDraggingRef.current = false;
    setIsInteracting(false);
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchUp);
  };

  const handleMouseDown = (e: ReactMouseEvent) => handleDragStart(e.clientX, e.clientY);
  const handleTouchStart = (e: ReactTouchEvent) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
  const handleTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
  const handleMouseUp = () => handleDragEnd();
  const handleTouchUp = () => handleDragEnd();

  if (!isMounted) {
    return null;
  }

  return (
    <div
      ref={buttonRef}
      className={cn(
        'fixed top-0 left-0 z-50 w-12 h-12 rounded-full bg-primary shadow-lg flex items-center justify-center cursor-grab transition-all duration-300',
        'hover:shadow-primary/40 hover:shadow-[0_0_15px_5px_hsl(var(--primary))]',
        isInteracting && 'cursor-grabbing scale-105 shadow-primary/40 shadow-[0_0_15px_5px_hsl(var(--primary))]',
        isVisible ? 'opacity-90 hover:opacity-100' : 'opacity-0 pointer-events-none'
      )}
      style={{ touchAction: 'none' }} // Prevent scrolling on mobile while dragging
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="w-full h-full flex items-center justify-center">
        <Home className="h-5 w-5 text-white" />
      </div>
    </div>
  );
}
