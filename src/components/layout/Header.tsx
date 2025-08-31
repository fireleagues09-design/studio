
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Flame, LogIn, Menu, UserPlus, LogOut, Wallet } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

type WalletData = {
    deposit: number;
    winning: number;
    bonus: number;
}

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/admin", label: "Admin" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setWallet(doc.data().wallet as WalletData);
          } else {
            console.log("No such user document!");
          }
        });
        return () => unsubscribeSnapshot();
      } else {
        setWallet(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };
  
  const totalBalance = wallet ? wallet.deposit + wallet.winning + wallet.bonus : 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
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
           {user && (
            <Link href="/profile" className={cn("transition-colors hover:text-foreground/80", pathname === "/profile" ? "text-foreground" : "text-foreground/60")}>
              Profile
            </Link>
          )}
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <div className="hidden md:flex items-center space-x-2">
            {!loading && (
              <>
                {user ? (
                  <>
                    {wallet !== null && (
                      <Button variant="outline" size="sm" asChild>
                         <Link href="/profile">
                          <Wallet className="mr-2 h-4 w-4 text-primary" />
                          ₹{totalBalance.toFixed(2)}
                        </Link>
                      </Button>
                    )}
                    <Button variant="ghost" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
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
                   {user && (
                    <Link href="/profile" className="text-lg font-medium">
                      Profile
                    </Link>
                  )}
                  <div className="border-t pt-4 flex flex-col space-y-3">
                    {!loading && (
                      <>
                        {user ? (
                           <>
                            {wallet !== null && (
                              <Button variant="outline" asChild>
                                  <Link href="/profile">
                                    <Wallet className="mr-2 h-4 w-4 text-primary" />
                                    ₹{totalBalance.toFixed(2)}
                                  </Link>
                              </Button>
                            )}
                            <Button variant="outline" onClick={handleLogout}>
                              Logout
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" asChild>
                              <Link href="/login">Login</Link>
                            </Button>
                            <Button asChild>
                              <Link href="/register">Register</Link>
                            </Button>
                          </>
                        )}
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
