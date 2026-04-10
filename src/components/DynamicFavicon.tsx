'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * DynamicFavicon Component
 * 
 * Listens to branding settings in Firestore and renders hoisted link tags.
 * Uses standard-compliant rel types and sizes for immediate browser detection.
 */
export function DynamicFavicon() {
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'branding'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.faviconUrl) {
          setFaviconUrl(data.faviconUrl);
        }
      }
    }, (error) => {
      console.error("Favicon listener error:", error);
    });
    return () => unsub();
  }, []);

  if (!faviconUrl) return null;

  return (
    <>
      {/* Primary Favicon - sizes="any" tells the browser this can be scaled */}
      <link rel="icon" href={faviconUrl} sizes="any" type="image/png" />
      
      {/* Legacy Support */}
      <link rel="shortcut icon" href={faviconUrl} />
      
      {/* Apple Touch Icon - for mobile bookmarks and home screens */}
      <link rel="apple-touch-icon" href={faviconUrl} />
    </>
  );
}