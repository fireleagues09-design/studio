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

export const metadata: Metadata = {
  title: "FireLeagues - Free Fire Tournaments",
  description:
    "Join the ultimate Free Fire esports tournaments. Compete and win!",
};

// This script prevents the theme from flickering on page load.
const antiFlickerScript = `
(function() {
  try {
    const mode = localStorage.getItem('fireleagues-ui-mode') || 'dark';
    const theme = localStorage.getItem('fireleagues-theme') || 'orange';
    const root = document.documentElement;

    if (mode === 'dark') {
      root.classList.add('dark');
    }

    const allThemes = ['orange', 'violet', 'green', 'pink', 'blue', 'yellow', 'red', 'teal', 'lime', 'cyan', 'indigo', 'grape', 'spring-green'];
    allThemes.forEach(t => {
      root.classList.remove('theme-' + t);
    });
    root.classList.add('theme-' + theme);

  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: antiFlickerScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
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
