
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogIn, Menu, User, UserPlus, Wallet, Shield } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

type WalletData = {
    deposit: number;
    winning: number;
    bonus: number;
}

type UserProfile = {
    wallet: WalletData;
    isAdmin?: boolean;
}

function Logo() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-8 w-8 text-primary"
        >
           <path d="M12.83,3.08c-0.1-0.09-0.24-0.12-0.37-0.09c-2.67,0.6-4.93,2.44-5.92,5.11c-1.01,2.73-0.8,5.77,0.61,8.32c1.38,2.5,3.95,4.18,6.86,4.36c0.3,0.02,0.6-0.01,0.89-0.07c2.75-0.5,5.1-2.25,6.47-4.75c1.4-2.55,1.6-5.49,0.59-8.22c-0.99-2.67-3.24-4.52-5.9-4.82c-0.12-0.01-0.24,0.03-0.33,0.12c-0.1,0.09-0.15,0.22-0.14,0.34c0.01,0.28,0.03,0.55,0.08,0.82c0.02,0.12,0.08,0.22,0.18,0.29c0.1,0.07,0.22,0.08,0.33,0.04c0.23-0.09,0.46-0.14,0.69-0.14c1.1,0,2.14,0.43,2.92,1.21c0.78,0.78,1.21,1.82,1.21,2.92c0,1.1-0.43,2.14-1.21,2.92c-0.78,0.78-1.82,1.21-2.92,1.21c-1.1,0-2.14-0.43-2.92-1.21c-0.53-0.53-0.92-1.18-1.15-1.89c-0.11-0.32-0.04-0.67,0.18-0.92c0.22-0.25,0.56-0.36,0.89-0.28c0.64,0.15,1.3,0.22,1.96,0.22c2.3,0,4.49-0.9,6.13-2.54c1.64-1.64,2.54-3.83,2.54-6.13c0-3.31-1.67-6.29-4.28-7.9c-1.2-0.73-2.55-1.13-3.95-1.17l-0.02,0C12.28,2,12.25,2,12.22,2c-2.99,0-5.79,1.39-7.66,3.79c-2.39,3.08-3.23,7.06-2.2,10.8c0.65,2.34,2.06,4.35,3.98,5.69c0.11,0.08,0.25,0.1,0.38,0.06c0.14-0.04,0.24-0.14,0.28-0.28c0.14-0.49,0.34-0.97,0.58-1.43c0.08-0.14,0.04-0.32-0.09-0.42c-0.12-0.1-0.3-0.1-0.42-0.01c-1.1,0.89-1.85,2.2-1.85,3.66c0,2.07,1.22,3.88,3.03,4.63c0.09,0.04,0.19,0.06,0.29,0.06c0.11,0,0.22-0.02,0.33-0.05c1.11-0.35,2.02-1.14,2.58-2.23c0.56-1.09,0.74-2.36,0.53-3.58c-0.06-0.34-0.25-0.64-0.53-0.84c-0.28-0.2-0.62-0.28-0.95-0.2c-0.7,0.15-1.38,0.44-2,0.85c-0.16,0.1-0.36,0.09-0.51-0.02c-0.15-0.11-0.24-0.29-0.24-0.47c0-0.21,0.09-0.4,0.24-0.53c0.7-0.6,1.52-1.04,2.4-1.28c0.16-0.04,0.29-0.15,0.35-0.3c0.07-0.15,0.06-0.33-0.02-0.48c-0.08-0.15-0.23-0.24-0.39-0.24c-0.04,0-0.07-0.01-0.11-0.02c-1.78-0.5-3.33-1.63-4.4-3.15c-1.07-1.52-1.6-3.3-1.52-5.12c0.08-1.82,0.88-3.52,2.22-4.74c1.34-1.22,3.1-1.86,4.92-1.86c0.8,0,1.58,0.14,2.32,0.42c0.15,0.06,0.26,0.18,0.3,0.33c0.05,0.15,0.02,0.32-0.07,0.45c-0.2,0.28-0.18,0.67,0.05,0.92c0.23,0.25,0.58,0.36,0.9,0.27c0.64-0.18,1.26-0.47,1.82-0.87c0.13-0.09,0.29-0.1,0.42-0.03c0.14,0.08,0.22,0.22,0.22,0.38c0,0.19-0.08,0.37-0.22,0.49c-0.67,0.58-1.44,1.02-2.28,1.29c-0.16,0.05-0.28,0.18-0.32,0.34c-0.04,0.16,0,0.33,0.1,0.47c0.09,0.14,0.25,0.22,0.41,0.22c0.04,0,0.08-0.01,0.12-0.02c1.78-0.57,3.33-1.77,4.4-3.4c1.07-1.63,1.6-3.55,1.52-5.47c-0.08-1.92-0.88-3.72-2.22-4.94C16.89,3.84,15.12,3.2,13.3,3.2c-0.8,0-1.58,0.14-2.32,0.42C10.83,3.68,10.7,3.8,10.65,3.95z"/>
        </svg>
    )
}

export function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            const userDocRef = doc(db, "users", currentUser.uid);
            const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
                if (doc.exists()) {
                    setProfile(doc.data() as UserProfile);
                } else {
                    setProfile(null);
                }
                 setLoading(false);
            });
            return () => unsubscribeProfile();
        } else {
            setProfile(null);
            setLoading(false);
        }
    });

    return () => unsubscribeAuth();
  }, []);
  
  const wallet = profile?.wallet || { deposit: 0, winning: 0, bonus: 0 };
  const totalBalance = wallet.deposit + wallet.winning + wallet.bonus;

  const navLinks = [
    { href: "/", label: "Home" },
    { href: !loading && user ? "/tournaments" : "/register", label: "Tournaments" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="mr-6 flex items-center space-x-2">
            <Logo />
            <span className="font-bold text-lg">FireLeagues</span>
        </Link>
        
        <div className="flex-1 flex justify-center">
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            {navLinks.map((link) => (
                <Link
                key={link.href}
                href={link.href}
                className={cn(
                    "transition-colors hover:text-foreground/80",
                    pathname === link.href
                    ? "text-foreground"
                    : "text-foreground/60"
                )}
                >
                {link.label}
                </Link>
            ))}
            </nav>
        </div>

        <div className="flex items-center justify-end space-x-2">
          <div className="hidden md:flex items-center space-x-2">
            {loading ? (
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-9 rounded-full" />
                </div>
            ) : user ? (
              <>
                {profile?.isAdmin && (
                   <Button variant="ghost" size="sm" asChild>
                     <Link href="/admin">
                       <Shield className="mr-2 h-4 w-4" />
                       Admin
                     </Link>
                   </Button>
                )}
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/wallet">
                    <Wallet className="mr-2 h-4 w-4 text-primary" />
                    ₹{totalBalance.toFixed(2)}
                    </Link>
                </Button>
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/profile">
                        <User className="h-5 w-5" />
                    </Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">
                    Login
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">
                    Register
                  </Link>
                </Button>
              </>
            )}
          </div>
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>
                    <Link href="/" className="flex items-center space-x-2">
                      <Logo />
                      <span className="font-bold text-lg">FireLeagues</span>
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-6">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-lg font-medium"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="border-t pt-4 flex flex-col space-y-3">
                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : user ? (
                       <div className="space-y-2">
                         {profile?.isAdmin && (
                            <Button variant="ghost" asChild className="w-full justify-start">
                              <Link href="/admin">
                                <Shield className="mr-2 h-4 w-4" />
                                Admin Panel
                              </Link>
                            </Button>
                         )}
                         <Button variant="outline" asChild className="w-full justify-start">
                              <Link href="/wallet">
                                <Wallet className="mr-2 h-4 w-4 text-primary" />
                                Wallet: ₹{totalBalance.toFixed(2)}
                              </Link>
                          </Button>
                        <Button variant="ghost" asChild className="w-full justify-start">
                             <Link href="/profile">
                                <User className="mr-2 h-4 w-4" />
                                My Profile
                            </Link>
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button variant="outline" asChild className="w-full justify-start">
                          <Link href="/login">
                            <LogIn className="mr-2 h-4 w-4" />
                            Login
                          </Link>
                        </Button>
                        <Button asChild className="w-full justify-start">
                          <Link href="/register">
                             <UserPlus className="mr-2 h-4 w-4" />
                             Register
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

    