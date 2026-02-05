
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // The loader is now hidden by each page when its content is ready.
    // This component is preserved for potential future navigation events.
  }, [pathname, searchParams]);

  return null;
}
