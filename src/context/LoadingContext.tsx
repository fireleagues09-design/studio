'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';

type LoadingContextType = {
  isLoading: boolean;
  showLoader: () => void;
  hideLoader: () => void;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const showLoader = useCallback(() => setIsLoading(true), []);
  const hideLoader = useCallback(() => setIsLoading(false), []);
  
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor) {
        const href = anchor.getAttribute('href');
        const currentPath = window.location.pathname + window.location.search;
        
        // Don't trigger for external, hash, or same-page links
        if (!href || !href.startsWith('/') || href.startsWith('//') || href === currentPath) {
          return;
        }

        // Don't trigger for links with target="_blank"
        if (anchor.target === '_blank') {
          return;
        }
        
        showLoader();
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      document.removeEventListener('click', handleAnchorClick);
    };
  }, [showLoader]);


  return (
    <LoadingContext.Provider value={{ isLoading, showLoader, hideLoader }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
