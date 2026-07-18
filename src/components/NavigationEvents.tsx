'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';

export function NavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hideLoader } = useLoading();

  useEffect(() => {
    // When the path or search params change, hide the loader quickly.
    // Reduced from 500ms to 100ms to make transitions feel snappier.
    const timer = setTimeout(() => {
      hideLoader();
    }, 100); 

    return () => clearTimeout(timer);
  }, [pathname, searchParams, hideLoader]);

  return null;
}
