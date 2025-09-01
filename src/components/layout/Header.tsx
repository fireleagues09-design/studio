
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
           <path d="M10.7,4.2C9,4,7.4,4.6,6.3,5.9c-2.3,2.6-2,6.6,0.6,8.9c2.6,2.3,6.6,2,8.9-0.6c0.8-0.9,1.2-2,1.2-3.1 c0-0.4-0.1-0.9-0.2-1.3C16.6,9.7,16.5,9.5,16.5,9.5s-2.1,1.5-2.1,1.5c-0.2-0.1-0.5-0.2-0.7-0.2c-0.9,0-1.8,0.4-2.4,1 c-1,1-1.2,2.4-0.6,3.6c0.2,0.5,0.5,0.8,0.9,1.1c-1.3,0.3-2.6-0.3-3.3-1.4c-1.2-1.8-0.8-4.1,1-5.4c1-0.7,2.2-0.8,3.3-0.4 c0.2,0.1,0.4,0.1,0.6,0.2c0,0,1-2.4,1-2.4C12.8,5,11.8,4.2,10.7,4.2z"/>
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
