
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * DynamicFavicon Component
 * 
 * Listens to branding settings in Firestore and renders hoisted link tags.
 * Since we now use unique filenames in BrandingAdmin, caching is bypassed automatically.
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
      {/* 🔧 STEP 4 FIX: Use standard compliant attributes for maximum compatibility */}
      <link rel="icon" href={faviconUrl} sizes="any" type="image/png" />
      <link rel="shortcut icon" href={faviconUrl} />
      <link rel="apple-touch-icon" href={faviconUrl} />
    </>
  );
}
