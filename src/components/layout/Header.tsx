
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Flame, LogIn, Menu, User, UserPlus, Wallet, Shield } from "lucide-react";
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

type WalletData = {
    deposit: number;
    winning: number;
    bonus: number;
}

type UserProfile = {
    wallet: WalletData;
    isAdmin?: boolean;
}

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
];

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
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        });
        return () => unsubscribeSnapshot();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);
  
  const wallet = profile?.wallet || { deposit: 0, winning: 0, bonus: 0 };
  const totalBalance = wallet.deposit + wallet.winning + wallet.bonus;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Flame className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">FireLeagues</span>
        </Link>

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

        <div className="flex flex-1 items-center justify-end">
          <div className="hidden md:flex items-center space-x-2">
            {loading ? null : user ? (
              <>
                {profile?.isAdmin && (
                   <Button variant="ghost" size="sm" asChild>
                     <Link href="/admin">
                       <Shield className="mr-2 h-4 w-4" />
                       Admin Panel
                     </Link>
                   </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                    <Link href="/wallet">
                    <Wallet className="mr-2 h-4 w-4 text-primary" />
                    ₹{totalBalance.toFixed(2)}
                    </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        My Profile
                    </Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/register">
                    <UserPlus className="mr-2 h-4 w-4" />
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
                      <Flame className="h-6 w-6 text-primary" />
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
                    {loading ? null : user ? (
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
                                ₹{totalBalance.toFixed(2)}
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
