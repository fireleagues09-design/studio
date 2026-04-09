
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * DynamicFavicon Component
 * 
 * Listens to branding settings in Firestore and updates the browser's 
 * favicon link element in real-time with cache-busting logic.
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
    }, (error) => {
      console.error("Favicon listener error:", error);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!faviconUrl) return;

    // Update the DOM favicon link
    const updateIcon = () => {
      // Browsers cache favicons very aggressively. 
      // We append a version timestamp to force a refresh.
      const bustCacheUrl = `${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;

      // 1. Update Standard Favicon
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      
      link.href = bustCacheUrl;
      
      // 2. Update Apple Touch Icon (for mobile bookmarks)
      let appleIcon: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = bustCacheUrl;

      // 3. Update Shortcut Icon (legacy support)
      let shortcutIcon: HTMLLinkElement | null = document.querySelector("link[rel='shortcut icon']");
      if (shortcutIcon) {
        shortcutIcon.href = bustCacheUrl;
      }

      console.log("Favicon updated with cache-bust:", bustCacheUrl);
    };

    updateIcon();
  }, [faviconUrl]);

  return null; // This component doesn't render any visible UI
}
