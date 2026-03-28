
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
  Palette,
  AlertTriangle,
  Briefcase,
  Tag,
  Headset,
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
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  sendEmailVerification,
  signInWithCredential,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { SuspendedUserPopup } from '@/components/SuspendedUserPopup';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useTheme, type ColorTheme } from "@/context/ThemeProvider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLoading } from "@/context/LoadingContext";
import BestiePage from '@/components/BestiePage';
import { Alert } from "../ui/alert";
import { CompleteProfileDialog } from "@/components/CompleteProfileDialog";


type WalletData = {
    deposit: number;
    winning: number;
    bonus: number;
}

type UserProfile = {
    username: string;
    wallet: WalletData;
    isAdmin?: boolean;
    isSupport?: boolean;
    isEmployee?: boolean;
    suspended?: boolean;
    suspensionNote?: string;
    isRegistered?: boolean;
    isBestie?: boolean;
    bestiePageActive?: boolean;
    emailVerified?: boolean;
}

const themes: { name: ColorTheme }[] = [
  { name: 'orange' },
  { name: 'violet' },
  { name: 'green' },
  { name: 'pink' },
  { name: 'blue' },
  { name: 'yellow' },
  { name: 'red' },
  { name: 'teal' },
  { name: 'lime' },
  { name: 'cyan' },
  { name: 'indigo' },
  { name: 'grape' },
  { name: 'spring-green' },
];


export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();
  const { showLoader } = useLoading();
  const { theme, setTheme, mode, setMode } = useTheme();
  const [showCompleteProfileDialog, setShowCompleteProfileDialog] = useState(false);
  
  const handleLogout = async () => {
    showLoader();
    setSheetOpen(false);
    await auth.signOut();
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    window.location.href = '/';
  };

  useEffect(() => {
    setLoading(true);
    
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            const userDocRef = doc(db, "users", currentUser.uid);
            const unsubscribeProfile = onSnapshot(userDocRef, 
              async (doc) => {
                if (doc.exists()) {
                    const profileData = doc.data() as UserProfile;
                    
                    if (profileData.isRegistered === false) {
                        setShowCompleteProfileDialog(true);
                    } else {
                        setShowCompleteProfileDialog(false);
                    }

                    setProfile(profileData);

                    if (currentUser.emailVerified && !profileData.emailVerified) {
                       await updateDoc(userDocRef, { emailVerified: true });
                    }
                    setLoading(false);
                } else {
                    setProfile(null);
                    setLoading(false);
                }
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
            setShowCompleteProfileDialog(false);
            setLoading(false);
        }
    });

    return () => {
        unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    const handleUserAfterLogin = async (user: FirebaseUser) => {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const providers = user.providerData.map(p => p.providerId);
        const isGoogleUser = providers.includes('google.com');

        if (!userDoc.exists()) {
            const newUsername = user.displayName?.replace(/\s/g, '').toLowerCase() || user.email?.split('@')[0] || `user${user.uid.substring(0, 5)}`;
            await setDoc(userDocRef, {
                username: newUsername,
                email: user.email,
                isRegistered: false,
                emailVerified: user.emailVerified || isGoogleUser,
                wallet: { deposit: 0, winning: 0, bonus: 0 },
                registeredOn: serverTimestamp(),
                lastLogin: serverTimestamp(),
                providers: providers,
            });
            toast({ title: "Welcome!", description: "Your account is ready. Let's complete your profile." });
        } else {
            const existingData = userDoc.data();
            const updatePayload: {providers: string[]; lastLogin: any; emailVerified?: boolean} = {
                providers: providers,
                lastLogin: serverTimestamp()
            };

            if (isGoogleUser && !existingData.emailVerified) {
                updatePayload.emailVerified = true;
            }

            try {
                await setDoc(userDocRef, updatePayload, { merge: true });
            } catch (error) {
                console.warn("Could not update user providers/lastLogin:", error);
            }
            toast({ title: "Success", description: "Logged in successfully!" });
        }
        router.push("/");
    };

    (window as any).signInWithGoogleToken = async function (token: string) {
        try {
            showLoader();
            const credential = GoogleAuthProvider.credential(token);
            const userCredential = await signInWithCredential(auth, credential);
            await handleUserAfterLogin(userCredential.user);
        } catch (error: any) {
            console.error("Google token login failed:", error);
            toast({ title: "Login Failed", description: error.message || "An unknown error occurred", variant: "destructive" });
        }
    };

    return () => {
        delete (window as any).signInWithGoogleToken;
    };
  }, [router, toast, showLoader]);

  const handleResendVerification = async () => {
    if (!user) return;
    try {
        const actionCodeSettings = {
            url: `${window.location.origin}/profile`,
            handleCodeInApp: true,
        };
        await sendEmailVerification(user, actionCodeSettings);
        toast({
            title: "Verification Link Sent",
            description: "A new verification link has been sent. Please be sure to check your inbox and spam folder.",
        });
    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message || "Failed to send verification link.",
            variant: "destructive",
        });
    }
  };


  const wallet = profile?.wallet || { deposit: 0, winning: 0, bonus: 0 };
  const totalBalance = wallet.deposit + wallet.winning + wallet.bonus;

  const isAdminUser = profile?.isAdmin === true;
  const isEmployeeUser = profile?.isEmployee === true;

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/tournaments", label: "Tournaments" },
    ...(user ? [{ href: "/support", label: "Support" }] : []),
  ];
  
  const renderThemeSwatches = () => (
    <div className="flex flex-wrap justify-start gap-1 px-1">
      {themes.map((t) => (
        <button
          key={t.name}
          onClick={() => setTheme(t.name)}
          aria-label={`Set ${t.name} theme`}
          className={cn(
            'p-0.5 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-popover',
            `theme-${t.name}`
          )}
        >
          <div className={cn(
            'w-5 h-5 rounded-full border-2 p-0.5',
            theme === t.name ? 'border-primary' : 'border-transparent'
          )}>
            <div className="w-full h-full rounded-full bg-primary" />
          </div>
        </button>
      ))}
    </div>
  );

  const renderMobileThemeSwatches = () => (
     <div className="grid grid-cols-4 gap-3 pt-2">
      {themes.map((t) => (
        <button
          key={`m-${t.name}`}
          onClick={() => setTheme(t.name)}
          aria-label={`Set ${t.name} theme`}
          className={cn(
            'p-0.5 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-popover',
            `theme-${t.name}`
          )}
        >
          <div className={cn(
            'w-7 h-7 rounded-full border-2 p-0.5',
             theme === t.name ? 'border-muted' : 'border-muted'
          )}>
            <div className="w-full h-full rounded-full bg-primary" />
          </div>
        </button>
      ))}
    </div>
  );

  const userMenuItems = (
    <>
        <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer"><User className="mr-2 h-4 w-4" /><span>Profile</span></Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
            <Link href="/support" className="cursor-pointer"><Headset className="mr-2 h-4 w-4" /><span>Live Support</span></Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="cursor-not-allowed">
            <ClipboardList className="mr-2 h-4 w-4" />
            <span>Orders</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="cursor-not-allowed">
            <Gift className="mr-2 h-4 w-4" />
            <span>Gift Shop</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="cursor-not-allowed">
            <Tag className="mr-2 h-4 w-4" />
            <span>Bonus Code</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
            <Link href="/wallet" className="cursor-pointer"><Wallet className="mr-2 h-4 w-4" /><span>Wallet</span></Link>
        </DropdownMenuItem>
        
        {(isAdminUser || isEmployeeUser) && <DropdownMenuSeparator />}
        {isAdminUser && (
            <DropdownMenuItem asChild>
                <Link href="/admin" className="cursor-pointer"><Shield className="mr-2 h-4 w-4" /><span>Admin Panel</span></Link>
            </DropdownMenuItem>
        )}
        {isEmployeeUser && (
            <DropdownMenuItem asChild>
                <Link href="/management" className="cursor-pointer"><Briefcase className="mr-2 h-4 w-4" /><span>Management</span></Link>
            </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
         <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                <Palette className="mr-2 h-4 w-4" />
                <span>Change UI Colour</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-60 p-0">
                    <div className="p-2 space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <Label htmlFor="dark-mode-toggle" className="text-sm font-normal">Dark Mode</Label>
                            <Switch
                                id="dark-mode-toggle"
                                checked={mode === 'dark'}
                                onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')}
                            />
                        </div>
                        <Separator />
                        <div className="space-y-1">
                            <Label className="px-1 text-xs text-muted-foreground">Accent Colour</Label>
                            {renderThemeSwatches()}
                        </div>
                    </div>
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
        </DropdownMenuSub>
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
            <Button variant="ghost" asChild className="w-full justify-start"><Link href="/profile"><User className="mr-2 h-4 w-4" />Profile</Link></Button>
        </SheetClose>
        <SheetClose asChild>
            <Button variant="ghost" asChild className="w-full justify-start"><Link href="/support"><Headset className="mr-2 h-4 w-4" />Live Support</Link></Button>
        </SheetClose>
        <Button variant="ghost" className="w-full justify-start" disabled><ClipboardList className="mr-2 h-4 w-4" />Orders</Button>
        <Button variant="ghost" className="w-full justify-start" disabled><Gift className="mr-2 h-4 w-4" />Gift Shop</Button>
        <Button variant="ghost" className="w-full justify-start" disabled><Tag className="mr-2 h-4 w-4" />Bonus Code</Button>
        
        <Separator className="my-2"/>
        
        <SheetClose asChild>
            <Button variant="ghost" asChild className="w-full justify-start">
                <Link href="/wallet"><Wallet className="mr-2 h-4 w-4" />Wallet</Link>
            </Button>
        </SheetClose>

        {(isAdminUser || isEmployeeUser) && <Separator className="my-2"/>}
        {isAdminUser && (
            <SheetClose asChild>
                <Button variant="ghost" asChild className="w-full justify-start"><Link href="/admin"><Shield className="mr-2 h-4 w-4" />Admin Panel</Link></Button>
            </SheetClose>
        )}
        {isEmployeeUser && (
            <SheetClose asChild>
                <Button variant="ghost" asChild className="w-full justify-start"><Link href="/management"><Briefcase className="mr-2 h-4 w-4" />Management</Link></Button>
            </SheetClose>
        )}
        
        <Separator className="my-2"/>
        
        <div className="px-2 space-y-1">
            <div className="flex items-center justify-between py-2">
                <Label className="font-normal">Dark Mode</Label>
                <Switch 
                    id="mobile-dark-mode"
                    checked={mode === 'dark'}
                    onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')}
                />
            </div>
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="colors" className="border-b-0">
                    <AccordionTrigger className="p-0 py-2 font-normal hover:no-underline">
                        UI Colour
                    </AccordionTrigger>
                    <AccordionContent>
                        {renderMobileThemeSwatches()}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
        
        <Separator className="my-2"/>
        
        <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
        </Button>
    </div>
  );

  const shouldShowBestiePage =
    profile?.isBestie === true && profile.bestiePageActive === true;

  const isGoogleUser = user?.providerData.some(p => p.providerId === 'google.com') ?? false;

  return (
    <>
      {shouldShowBestiePage && <BestiePage />}
      
      {profile?.suspended && <SuspendedUserPopup onLogout={handleLogout} note={profile.suspensionNote} />}

      <CompleteProfileDialog 
        open={showCompleteProfileDialog} 
        onSuccess={() => setShowCompleteProfileDialog(false)} 
      />
      
      {!loading && user && profile && !profile.emailVerified && !isGoogleUser && (
        <Alert variant="destructive" className="border-0 rounded-none bg-amber-400 text-black">
            <div className="container mx-auto px-4 py-2 flex items-center justify-center text-center text-sm font-medium gap-2">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <span>Your account is not fully activated.</span>
                <Button variant="link" onClick={handleResendVerification} className="p-0 h-auto text-black underline font-bold cursor-pointer">
                    Please verify your email
                </Button>
            </div>
        </Alert>
      )}

      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-[env(safe-area-inset-top)]">
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
                      "transition-colors hover:text-foreground/80 flex items-center gap-1.5",
                      pathname === link.href
                      ? "text-foreground"
                      : "text-foreground/60"
                  )}
                  >
                  {link.icon && <link.icon className="h-4 w-4" />}
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
              ) : user && profile ? (
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
                  <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" aria-label="Toggle theme">
                                <Palette className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60 p-0">
                             <div className="p-2 space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <Label htmlFor="dark-mode-toggle-guest" className="text-sm font-normal">Dark Mode</Label>
                                    <Switch
                                        id="dark-mode-toggle-guest"
                                        checked={mode === 'dark'}
                                        onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')}
                                    />
                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <Label className="px-1 text-xs text-muted-foreground">Accent Colour</Label>
                                    {renderThemeSwatches()}
                                </div>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

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
                            className="text-lg font-medium flex items-center gap-2"
                          >
                            {link.icon && <link.icon className="h-5 w-5" />}
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
                      ) : user && profile ? (
                         mobileUserMenuItems
                      ) : (
                        <>
                          <div className="px-2 space-y-1">
                              <div className="flex items-center justify-between py-2">
                                  <Label className="font-normal">Dark Mode</Label>
                                  <Switch 
                                      id="mobile-dark-mode-guest"
                                      checked={mode === 'dark'}
                                      onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')}
                                  />
                              </div>
                              <Accordion type="single" collapsible className="w-full">
                                  <AccordionItem value="colors" className="border-b-0">
                                      <AccordionTrigger className="p-0 py-2 font-normal hover:no-underline">
                                          UI Colour
                                      </AccordionTrigger>
                                      <AccordionContent>
                                          {renderMobileThemeSwatches()}
                                      </AccordionContent>
                                  </AccordionItem>
                              </Accordion>
                          </div>
                            <Separator />
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
