
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * DynamicFavicon Component
 * 
 * Listens to branding settings in Firestore and updates the browser's 
 * favicon link element in real-time.
 */
export function DynamicFavicon() {
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  useEffect(() => {
    // Listen for branding changes in Firestore
    const unsub = onSnapshot(doc(db, 'settings', 'branding'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.faviconUrl) {
          setFaviconUrl(data.faviconUrl);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!faviconUrl) return;

    // Update the DOM favicon link
    const updateIcon = () => {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      
      link.href = faviconUrl;
      
      // Also update apple-touch-icon if present for mobile bookmarks
      let appleIcon: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (appleIcon) {
        appleIcon.href = faviconUrl;
      }
    };

    updateIcon();
  }, [faviconUrl]);

  return null; // This component doesn't render any visible UI
}
