
"use client";

import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  LogIn,
  Menu,
  User,
  UserPlus,
  Wallet,
  Shield,
  Flame,
  LogOut,
  ClipboardList,
  MessageSquare,
  Gift,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { SuspendedUserPopup } from '@/components/SuspendedUserPopup';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";


type WalletData = {
    deposit: number;
    winning: number;
    bonus: number;
}

type UserProfile = {
    username: string;
    wallet: WalletData;
    isAdmin?: boolean;
    suspended?: boolean;
    isRegistered?: boolean;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    setLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            const userDocRef = doc(db, "users", currentUser.uid);
            const unsubscribeProfile = onSnapshot(userDocRef, 
              (doc) => {
                if (doc.exists()) {
                    const profileData = doc.data() as UserProfile;
                    setProfile(profileData);

                    // Safety Check: If user is not fully registered, force them to complete their profile.
                    if (profileData.isRegistered === false && !profileData.suspended && pathname !== '/complete-profile') {
                        router.push('/complete-profile');
                    }
                } else {
                    // Document doesn't exist for a logged-in user.
                    // This can happen for a moment during sign-up.
                    // Force redirect to be safe and ensure profile completion.
                    setProfile(null);
                    if (pathname !== '/complete-profile' && pathname !== '/auth/verify') {
                      router.push('/complete-profile');
                    }
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
  }, [pathname, router]);
  
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

  const userMenuItems = (
    <>
        <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer"><User className="mr-2 h-4 w-4" /><span>Profile</span></Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="cursor-not-allowed">
            <ClipboardList className="mr-2 h-4 w-4" />
            <span>Orders</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="cursor-not-allowed">
            <Gift className="mr-2 h-4 w-4" />
            <span>Gift Shop</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
            <Link href="/wallet" className="cursor-pointer"><Wallet className="mr-2 h-4 w-4" /><span>Wallet</span></Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="cursor-not-allowed">
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Chat Support</span>
            <span className="ml-auto text-xs">Soon</span>
        </DropdownMenuItem>
        
        {profile && profile.isAdmin === true && <DropdownMenuSeparator />}
        {profile && profile.isAdmin === true && (
            <DropdownMenuItem asChild>
                <Link href="/admin" className="cursor-pointer"><Shield className="mr-2 h-4 w-4" /><span>Admin Panel</span></Link>
            </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
        </DropdownMenuItem>
    </>
  )

  const mobileUserMenuItems = (
    <div className="space-y-1">
        <div className="p-2">
            <p className="text-sm font-semibold">{profile?.username || user?.displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Separator className="my-2"/>
        <SheetClose asChild>
            <Button variant="ghost" asChild className="w-full justify-start text-base"><Link href="/profile"><User className="mr-2 h-4 w-4" />Profile</Link></Button>
        </SheetClose>
        <Button variant="ghost" className="w-full justify-start text-base" disabled><ClipboardList className="mr-2 h-4 w-4" />Orders</Button>
        <Button variant="ghost" className="w-full justify-start text-base" disabled><Gift className="mr-2 h-4 w-4" />Gift Shop</Button>
        
        <Separator className="my-2"/>
        
        <SheetClose asChild>
            <Button variant="ghost" asChild className="w-full justify-start text-base">
                <Link href="/wallet"><Wallet className="mr-2 h-4 w-4" />Wallet</Link>
            </Button>
        </SheetClose>
        <Button variant="ghost" className="w-full justify-start text-base" disabled>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Chat Support</span>
            <span className="ml-auto text-xs">Soon</span>
        </Button>

        {profile && profile.isAdmin === true && <Separator className="my-2"/>}
        {profile && profile.isAdmin === true && (
            <SheetClose asChild>
                <Button variant="ghost" asChild className="w-full justify-start text-base"><Link href="/admin"><Shield className="mr-2 h-4 w-4" />Admin Panel</Link></Button>
            </SheetClose>
        )}
        
        <Separator className="my-2"/>

        <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-base">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
        </Button>
    </div>
  );

  return (
    <>
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
                  <Button variant="ghost" size="sm" asChild>
                      <Link href="/wallet">
                      <Wallet className="mr-2 h-4 w-4 text-primary" />
                      ₹{totalBalance.toFixed(2)}
                      </Link>
                  </Button>
                  
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                              <Avatar className="h-9 w-9">
                                  <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
                                  <AvatarFallback>{profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end">
                          <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                              <p className="text-sm font-medium leading-none">{profile?.username || user.displayName}</p>
                              <p className="text-xs leading-none text-muted-foreground">
                              {user.email}
                              </p>
                          </div>
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {userMenuItems}
                      </DropdownMenuContent>
                  </DropdownMenu>
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
                         mobileUserMenuItems
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
    </>
  );
}
