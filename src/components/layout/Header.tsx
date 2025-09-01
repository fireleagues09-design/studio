
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
           <path d="M12.03 2.13c-1.23.23-2.28.89-3.03 1.88-2.68 3.45-2.26 8.4.95 11.08 1.4.98 3.1 1.25 4.72.68 1.63-.58 2.9-2.04 3.43-3.68.1-.33.18-.66.23-.98.05-.33.08-.66.08-.98 0-.4-.06-.8-.18-1.18-.1-.32-.23-.63-.38-.93-.16-.3-.34-.59-.55-.85-.2-.27-.44-.52-.69-.75-.25-.23-.52-.44-.8-.63-.29-.19-.59-.36-.9-.5-.3-.14-.62-.26-.94-.35-.32-.09-.65-.16-1-.2-.22-.03-.44-.04-.66-.04-.23 0-.46.01-.68.04-.33.04-.66.1-1 .17-.32.07-.63.16-.94.27-.63.22-1.22.53-1.75.92-.53.39-1 .86-1.4 1.4-1.2 1.6-1.53 3.6-1.04 5.4.48 1.8 1.8 3.2 3.5 3.7.8.24 1.6.24 2.4 0 .8-.23 1.5-.68 2.1-1.2.6-.54 1-1.2 1.2-2 .1-.4.1-.8.1-1.2 0-.2-.02-.4-.05-.6-.03-.2-.08-.4-.13-.6-.05-.2-.1-.38-.18-.56-.07-.18-.15-.35-.24-.5-.1-.16-.2-.3-.3-.45-.1-.15-.2-.28-.3-.4-.1-.13-.2-.25-.3-.36-.1-.12-.2-.22-.28-.32l-1.1 1.2c.03.03.06.06.08.09.05.06.1.13.14.19.04.06.08.13.12.19.07.13.14.26.2.4.06.14.12.28.17.43.05.15.09.3.12.45.03.15.05.3.06.45.01.15.02.3.02.45 0 .28-.05.56-.14.83-.09.27-.23.53-.4.77-.18.24-.4.46-.64.64-.24.18-.5.33-.78.44-.28.11-.57.18-.87.2-.3.02-.6.02-.9 0-.3-.02-.6-.08-.87-.2-.28-.11-.54-.26-.78-.44-.24-.18-.46-.4-.64-.64-.17-.24-.31-.5-.4-.77-.09-.27-.14-.55-.14-.83 0-.28.05-.56.14-.83.09-.27.23-.53.4-.77.18-.24.4-.46.64-.64.5-.38.98-.6 1.5-.7.5-.1.98-.1 2.48-.1 1.5 0 2-.02 2.48.1.5.1.98.32 1.5.7.23.18.44.38.64.6.2.2.38.4.55.63.17.22.32.46.46.7.14.24.26.5.36.75.1.25.18.5.24.75.06.25.1.5.12.75.02.25.03.5.03.75 0 .5-.06 1-.2 1.5-.13.5-.32.96-.58 1.4-.26.44-.58.84-.98 1.2-.4.38-.86.7-1.35.94-.5.25-1.02.4-1.55.45-.53.05-1.07.05-1.6 0-.53-.04-1.05-.18-1.55-.45-.5-.24-.95-.56-1.35-.94-.4-.38-.72-.76-.98-1.2-.26-.44-.45-.9-.58-1.4-.14-.5-.2-1-.2-1.5 0-.25.01-.5.03-.75.02-.25.06-.5.12-.75.06-.25.14-.5.24-.75.1-.25.22-.5.36-.75.14-.24.3-.48.46-.7.17-.22.35-.43.55-.63.2-.2.4-.38.6-.55l1.1-1.2c-.16-.08-.3-.15-.46-.22-.16-.07-.3-.14-.46-.2-.16-.06-.3-.12-.46-.17-.16-.05-.3-.1-.45-.14-.15-.04-.3-.08-.45-.1-.15-.03-.3-.05-.45-.06-.15-.01-.3-.02-.45-.02-.3 0-.6.02-.9.06-.3.04-.6.1-.88.18-.28.08-.55.18-.8.3-.25.12-.5.25-.72.4-.22.14-.43.3-.62.47-.2.17-.38.35-.54.54-.16.2-.3.4-.44.6-.14.2-.26.4-.36.6-.1.2-.18.4-.25.6-.07.2-.12.4-.16.6-.04.2-.07.4-.08.6-.02.2-.02.4-.02.6s0 .4.02.6c.01.2.04.4.08.6.04.2.1.4.16.6.07.2.15.4.25.6.1.2.22.4.36.6.14.2.3.4.44.6.16.18.34.37.54.54.2.17.4.33.62.47.22.15.47.28.72.4.25.12.52.22.8.3.28.08.57.14.88.18.3.04.6.08.9.06.15 0 .3-.01.45-.02.15-.01.3-.03.45-.05.15-.02.3-.04.45-.07.15-.03.3-.06.45-.1.15-.04.3-.08.44-.13.15-.05.3-.1.44-.16.14-.06.28-.13.4-.2.13-.07.25-.15.37-.23.12-.08.23-.17.34-.26.1-.1.18-.2.26-.3.1-.1.18-.2.25-.3.07-.1.14-.2.2-.3l-1.2-1.1c-.04.04-.08.08-.12.1-.04.03-.08.06-.12.08-.03.02-.06.04-.1.06-.03.02-.06.03-.1.05-.06.03-.13.06-.2.08-.06.03-.13.05-.2.07-.06.02-.13.04-.2.05-.06.01-.13.02-.2.03-.13.02-.26.03-.4.04-.13.01-.26.01-.4.01-.26 0-.5-.03-.76-.08-.26-.05-.5-.14-.75-.25-.25-.11-.5-.24-.72-.4-.22-.16-.43-.34-.62-.53s-.36-.4-.52-.62c-.16-.22-.3-.46-.42-.7-.12-.25-.22-.5-.3-.77-.08-.27-.14-.55-.17-.83-.03-.28-.04-.56-.04-.84s.01-.56.04-.84c.03-.28.08-.56.17-.83.08-.27.18-.53.3-.77.12-.25.26-.48.42-.7.16-.22.34-.4.52-.62.18-.2.38-.37.6-.53.22-.16.45-.3.7-.42.23-.12.48-.22.72-.3.24-.08.5-.15.75-.2.25-.05.5-.08.76-.1.13 0 .26,0 .4.01.13,0 .26.01.4.02.06,0 .13.01.2.02.06,0 .13.01.2.02.06,0 .13.01.2.02l1.2-1.2c-.05-.04-.1-.08-.16-.12-.06-.04-.1-.08-.16-.12-.06-.04-.1-.08-.16-.12l-.16-.1c-.05-.03-.1-.06-.15-.09l-.15-.09c-.05-.03-.1-.06-.15-.09-.1-.06-.2-.12-.3-.18-.1-.06-.2-.11-.3-.17-.1-.06-.2-.11-.3-.17-.2-.12-.4-.22-.6-.32-.2-.1-.4-.2-.6-.28-.2-.08-.4-.15-.6-.2-.2-.05-.4-.1-.6-.13-.2-.03-.4-.06-.6-.08-.2-.02-.4-.03-.6-.04-.2-.01-.4-.01-.6-.01z" />
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
