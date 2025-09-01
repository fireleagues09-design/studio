import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FloatingHomeButton } from "@/components/FloatingHomeButton";

export const metadata: Metadata = {
  title: "FireLeagues - Free Fire Tournaments",
  description:
    "Join the ultimate Free Fire esports tournaments. Compete and win!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
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
        <div className="relative flex min-h-screen flex-col bg-background">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <FloatingHomeButton />
        <Toaster />
      </body>
    </html>
  );
}
