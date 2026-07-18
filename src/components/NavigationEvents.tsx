'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';

/**
 * NavigationEvents component
 * 
 * This component listens for changes in the URL (pathname or search parameters).
 * Instead of hiding the loader, it ensures the loader is SHOWN when a navigation event occurs
 * (such as clicking a link or using the browser's back/forward buttons).
 * 
 * The actual hiding of the loader is handled by the individual page components
 * once their specific data fetching and mounting logic is complete.
 */
export function NavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showLoader } = useLoading();

  useEffect(() => {
    // When the path or search params change, trigger the loader.
    // This catches navigations that might not be handled by the global click listener.
    showLoader();
    
    // We do NOT call hideLoader() here anymore.
    // Each page component is responsible for calling hideLoader() in its own useEffect
    // once it is truly "ready" (e.g., after Firestore data is loaded).
  }, [pathname, searchParams, showLoader]);

  return null;
}
