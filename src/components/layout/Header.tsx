
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogIn, Menu, User, UserPlus, Wallet, Shield, Flame, LogOut } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { SuspendedUserPopup } from '@/components/SuspendedUserPopup';


type WalletData = {
    deposit: number;
    winning: number;
    bonus: number;
}

type UserProfile = {
    wallet: WalletData;
    isAdmin?: boolean;
    suspended?: boolean;
}

function AdminConfirmationDialog({ children, isMobile = false }: { children: React.ReactNode, isMobile?: boolean }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const handleContinue = () => {
        router.push('/admin');
        if (isMobile) {
            setOpen(false); // Close sheet if on mobile
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {children}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Enter Admin Panel?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to enter the admin dashboard. This area contains sensitive controls. Please proceed with caution.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleContinue}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}


export function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            const userDocRef = doc(db, "users", currentUser.uid);
            const unsubscribeProfile = onSnapshot(userDocRef, 
              (doc) => {
                if (doc.exists()) {
                    setProfile(doc.data() as UserProfile);
                } else {
                    if (pathname !== '/login' && pathname !== '/register') {
                         auth.signOut();
                    }
                    setProfile(null);
                }
                 setLoading(false);
              }, 
              (error) => {
                 console.error("Error fetching user profile:", error);
                 setLoading(false);
                 setProfile(null);
              }
            );
            return () => unsubscribeProfile();
        } else {
            setProfile(null);
            setLoading(false);
        }
    });

    return () => unsubscribeAuth();
  }, [pathname]);
  
  const wallet = profile?.wallet || { deposit: 0, winning: 0, bonus: 0 };
  const totalBalance = wallet.deposit + wallet.winning + wallet.bonus;

  const navLinks = [
    { href: "/", label: "Home" },
    { href: user ? "/tournaments" : "/register", label: "Tournaments" },
  ];
  
  const handleLogout = async () => {
    await auth.signOut();
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    window.location.href = '/';
  };

  if (profile?.suspended) {
      return <SuspendedUserPopup onLogout={handleLogout} />;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="mr-6 flex items-center space-x-2">
            <Flame className="h-6 w-6 text-primary" />
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
                  <AdminConfirmationDialog>
                    <Button variant="outline" size="sm">
                       <Shield className="mr-2 h-4 w-4" />
                       Admin Panel
                     </Button>
                   </AdminConfirmationDialog>
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
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
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
            <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>
                     <SheetClose asChild>
                        <Link href="/" className="flex items-center space-x-2">
                          <Flame className="h-6 w-6 text-primary" />
                          <span className="font-bold text-lg">FireLeagues</span>
                        </Link>
                    </SheetClose>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-6">
                  {navLinks.map((link) => (
                     <SheetClose asChild key={link.href}>
                        <Link
                          href={link.href}
                          className="text-lg font-medium"
                        >
                          {link.label}
                        </Link>
                    </SheetClose>
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
                            <AdminConfirmationDialog isMobile={true}>
                                <Button variant="ghost" className="w-full justify-start">
                                    <Shield className="mr-2 h-4 w-4" />
                                    Admin Panel
                                </Button>
                            </AdminConfirmationDialog>
                         )}
                         <SheetClose asChild>
                             <Button variant="outline" asChild className="w-full justify-start">
                                  <Link href="/wallet">
                                    <Wallet className="mr-2 h-4 w-4 text-primary" />
                                    Wallet: ₹{totalBalance.toFixed(2)}
                                  </Link>
                              </Button>
                          </SheetClose>
                         <SheetClose asChild>
                            <Button variant="ghost" asChild className="w-full justify-start">
                                 <Link href="/profile">
                                    <User className="mr-2 h-4 w-4" />
                                    My Profile
                                </Link>
                            </Button>
                         </SheetClose>
                         <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
                             <LogOut className="mr-2 h-4 w-4" />
                             Logout
                         </Button>
                      </div>
                    ) : (
                      <>
                        <SheetClose asChild>
                            <Button variant="outline" asChild className="w-full justify-start">
                              <Link href="/login">
                                <LogIn className="mr-2 h-4 w-4" />
                                Login
                              </Link>
                            </Button>
                        </SheetClose>
                        <SheetClose asChild>
                            <Button asChild className="w-full justify-start">
                              <Link href="/register">
                                 <UserPlus className="mr-2 h-4 w-4" />
                                 Register
                              </Link>
                            </Button>
                        </SheetClose>
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
