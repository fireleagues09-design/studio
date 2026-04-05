'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/context/LoadingContext';

/**
 * This page handles users who accidentally type /sitemap instead of /sitemap.xml
 * It hides the global loader and redirects them to the actual XML file.
 */
export default function SitemapRedirect() {
  const { hideLoader } = useLoading();
  const router = useRouter();

  useEffect(() => {
    hideLoader();
    // Redirect to the actual static XML file in the public folder
    window.location.href = '/sitemap.xml';
  }, [hideLoader]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-muted-foreground animate-pulse">Redirecting to sitemap...</p>
    </div>
  );
}
