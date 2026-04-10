'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';

export function NavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hideLoader } = useLoading();

  useEffect(() => {
    // When the path or search params change, it means the navigation has completed
    // its initial step. We force hide the loader as a fallback.
    const timer = setTimeout(() => {
      hideLoader();
    }, 500); // Small delay to allow the new page component to mount

    return () => clearTimeout(timer);
  }, [pathname, searchParams, hideLoader]);

  return null;
}
