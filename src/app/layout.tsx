import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FloatingHomeButton } from "@/components/FloatingHomeButton";
import { LoadingProvider } from "@/context/LoadingContext";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { NavigationEvents } from "@/components/NavigationEvents";
import { ThemeProvider } from "@/context/ThemeProvider";
import { db } from "@/lib/firebase-admin";

export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl = "/favicon.ico";
  try {
    // Fetch the custom dynamic branding from Firestore
    const brandingDoc = await db.collection('settings').doc('branding').get();
    if (brandingDoc.exists) {
      const data = brandingDoc.data();
      if (data?.faviconUrl) {
        faviconUrl = data.faviconUrl;
      }
    }
  } catch (e) {
    console.error("Error fetching metadata branding:", e);
  }

  // Force cache-busting so browsers see the update instantly
  const bust = Date.now();
  const finalUrl = `${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}v=${bust}`;

  return {
    title: "FireLeagues",
    description: "Gaming platform",
    icons: {
      icon: [
        { url: finalUrl, sizes: "any" },
        { url: finalUrl, type: "image/png" }
      ],
      shortcut: finalUrl,
      apple: finalUrl,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
        {/* Nuclear Fix: Purge old Service Workers that cache the old favicon */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(regs => {
                regs.forEach(reg => reg.unregister());
              });
            }
          `
        }} />
      </head>
      <body className={cn("font-body antialiased")}>
        <ThemeProvider
          storageKey="fireleagues-theme"
          modeStorageKey="fireleagues-mode"
          defaultTheme="orange"
        >
          <LoadingProvider>
            <div className="relative flex min-h-screen flex-col bg-background">
              <Header />
              <main className="flex-1">
                <Suspense fallback={<div className="h-screen bg-background" />}>
                  {children}
                </Suspense>
              </main>
              <Footer />
            </div>
            <FloatingHomeButton />
            <Toaster />
            <FullScreenLoader />
            <Suspense fallback={null}>
              <NavigationEvents />
            </Suspense>
          </LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
