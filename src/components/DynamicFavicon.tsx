
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * DynamicFavicon Component
 * 
 * Listens to branding settings in Firestore and renders hoisted link tags
 * to update the browser's favicon in real-time with aggressive cache-busting.
 */
export function DynamicFavicon() {
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  useEffect(() => {
    // Listen for branding changes in Firestore
    const unsub = onSnapshot(doc(db, 'settings', 'branding'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.faviconUrl) {
          console.log("🔥 New Favicon detected:", data.faviconUrl);
          setFaviconUrl(data.faviconUrl);
          // Increment trigger to force a re-render of the link tags with a new timestamp
          setUpdateTrigger(prev => prev + 1);
        }
      }
    }, (error) => {
      console.error("Favicon listener error:", error);
    });
    return () => unsub();
  }, []);

  if (!faviconUrl) return null;

  // Browsers cache favicons extremely aggressively. 
  // We use a combination of the URL length and a timestamp trigger to ensure uniqueness.
  const bustCacheUrl = `${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}v=${updateTrigger}`;

  return (
    <>
      {/* Next.js hoists these tags to the <head> automatically */}
      <link rel="icon" href={bustCacheUrl} sizes="any" />
      <link rel="shortcut icon" href={bustCacheUrl} />
      <link rel="apple-touch-icon" href={bustCacheUrl} />
    </>
  );
}
