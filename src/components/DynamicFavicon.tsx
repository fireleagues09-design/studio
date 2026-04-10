'use client';

import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * DynamicFavicon Component
 * 
 * Aggressively manages the website's favicon by purging existing tags 
 * and injecting new ones from Firestore settings. This bypasses 
 * static defaults and aggressive browser caching.
 */
export function DynamicFavicon() {
  useEffect(() => {
    // Listen for branding changes in Firestore
    const unsub = onSnapshot(doc(db, 'settings', 'branding'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.faviconUrl) {
          applyFavicon(data.faviconUrl);
        }
      }
    }, (error) => {
      console.error("Favicon dynamic listener error:", error);
    });
    
    return () => unsub();
  }, []);

  const applyFavicon = (url: string) => {
    if (typeof window === 'undefined') return;

    // 1. Identification of tags to purge (Next.js defaults, old icons, etc)
    const selectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="alternate icon"]'
    ];
    
    // 2. Clear old tags from the DOM to avoid conflicts
    // Using .remove() is safer than parentNode.removeChild() as it handles detached nodes gracefully
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el && typeof el.remove === 'function') {
          el.remove();
        }
      });
    });

    // 3. Create fresh tags with a cache-busting timestamp
    const timestamp = Date.now();
    // Ensure the URL has a versioning parameter to force browser refresh
    const bustedUrl = `${url}${url.includes('?') ? '&' : '?'}v=${timestamp}`;

    const tags = [
      { rel: 'icon', href: bustedUrl, type: 'image/png', sizes: '32x32' },
      { rel: 'shortcut icon', href: bustedUrl },
      { rel: 'apple-touch-icon', href: bustedUrl, sizes: '180x180' }
    ];

    const head = document.getElementsByTagName('head')[0];
    if (!head) return;

    tags.forEach(tagAttrs => {
      const link = document.createElement('link');
      Object.entries(tagAttrs).forEach(([key, value]) => link.setAttribute(key, value));
      head.appendChild(link);
    });
    
    console.log("Website Icon System: Dynamic update applied", bustedUrl);
  };

  return null; // Side-effect only component
}
