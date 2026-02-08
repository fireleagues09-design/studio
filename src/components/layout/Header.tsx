

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
  Hand,
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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";


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
    isBestie?: boolean;
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


const EMOJIS = ['🎁', '💖'];

const BestiePage = () => {
  const [particles, setParticles] = useState<{ id: number; content: string | null; x: number; delay: number; duration: number; type: 'emoji' | 'snow' }[]>([]);
  const [step, setStep] = useState('initial'); // 'initial', 'why', 'must_play', 'help', 'chase', 'caught', 'final'
  
  // States for 'why' step
  const [showContinueAnimation, setShowContinueAnimation] = useState(false);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const animationEndedRef = useRef(false);

  // States for 'must_play' (teleport) step
  const [noHoverCount, setNoHoverCount] = useState(0);
  const [noButtonPos, setNoButtonPos] = useState<React.CSSProperties>({});
  const [noButtonLastSide, setNoButtonLastSide] = useState<'left' | 'right' | null>(null);
  
  // States for 'chase' step
  const [runawayPos, setRunawayPos] = useState<React.CSSProperties>({ top: '50%', left: '50%', position: 'absolute', opacity: 0, transition: 'top 0.5s ease-out, left 0.5s ease-out' });
  const [handsPos, setHandsPos] = useState({
    left: { top: '50%', left: 'calc(50% - 6rem)' },
    right: { top: '50%', left: 'calc(50% + 6rem)' },
  });

  // State for 'final' step
  const [showFinalFall, setShowFinalFall] = useState(false);

  // Timer/Interval refs
  const chaseIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const catchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 150 }).map((_, i) => {
        const isEmoji = Math.random() > 0.9; 
        return {
          id: i,
          content: isEmoji ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : null,
          type: isEmoji ? 'emoji' : 'snow',
          x: Math.random() * 100,
          delay: Math.random() * 15,
          duration: Math.random() * 7 + 8,
        };
      });
      setParticles(newParticles);
    };
    generateParticles();
  }, []);

  // Effect for 'why' step animation
  useEffect(() => {
    if (step === 'why') {
      const timer = setTimeout(() => {
        setShowContinueAnimation(true);
        animationEndedRef.current = false;
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowContinueAnimation(false);
      setShowContinueButton(false);
    }
  }, [step]);
  
  // Effect for 'chase' step animation
  useEffect(() => {
    if (step !== 'chase') {
      if (chaseIntervalRef.current) clearInterval(chaseIntervalRef.current);
      if (catchTimeoutRef.current) clearTimeout(catchTimeoutRef.current);
      return;
    }

    setRunawayPos({ top: '50%', left: '50%', position: 'absolute', opacity: 1, transition: 'top 0.5s ease-out, left 0.5s ease-out' });
    
    // Local variable to track quadrant to avoid stale state issues in setInterval
    let currentQuadrant = -1;

    chaseIntervalRef.current = setInterval(() => {
       // New quadrant logic to ensure "long distance" runs
       let nextQuadrant = Math.floor(Math.random() * 4);
       while (nextQuadrant === currentQuadrant) {
         nextQuadrant = Math.floor(Math.random() * 4);
       }
       currentQuadrant = nextQuadrant;

       let top, left;
       switch(nextQuadrant) {
           case 0: // top-left
               top = `${Math.random() * 25 + 10}%`; // 10-35
               left = `${Math.random() * 25 + 10}%`; // 10-35
               break;
           case 1: // top-right
               top = `${Math.random() * 25 + 10}%`; // 10-35
               left = `${Math.random() * 25 + 65}%`; // 65-90
               break;
           case 2: // bottom-left
               top = `${Math.random() * 25 + 65}%`; // 65-90
               left = `${Math.random() * 25 + 10}%`; // 10-35
               break;
           case 3: // bottom-right
           default:
               top = `${Math.random() * 25 + 65}%`; // 65-90
               left = `${Math.random() * 25 + 65}%`; // 65-90
               break;
       }

       setRunawayPos(currentPos => ({
            ...currentPos,
            top: top,
            left: left,
        }));
    }, 700);

    catchTimeoutRef.current = setTimeout(() => {
        if (chaseIntervalRef.current) clearInterval(chaseIntervalRef.current);
        setStep('caught');
    }, 4000);

    return () => {
      if (chaseIntervalRef.current) clearInterval(chaseIntervalRef.current);
      if (catchTimeoutRef.current) clearTimeout(catchTimeoutRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Effect to make hands follow the button
  useEffect(() => {
     if (step === 'chase' || step === 'caught') {
        const top = runawayPos.top as string;
        const left = runawayPos.left as string;
        setHandsPos({
            left: { top: top, left: `calc(${left} - 4rem)` },
            right: { top: top, left: `calc(${left} + 4rem)` }
        });
     }
  }, [runawayPos, step]);
  
  // Effect for final fall
  useEffect(() => {
    if (step === 'final') {
        const timer = setTimeout(() => setShowFinalFall(true), 500);
        return () => clearTimeout(timer);
    }
  }, [step]);

  const handleBallAnimationEnd = () => {
    if (!animationEndedRef.current) {
        animationEndedRef.current = true;
        setTimeout(() => setShowContinueButton(true), 0);
    }
  };

  const handleNoHover = () => {
    if (step === 'must_play') {
      if (noHoverCount >= 6) {
        setStep('help');
        setNoButtonPos({}); // Reset position
        setNoButtonLastSide(null);
        return;
      }
      
      setNoHoverCount(c => c + 1);

      const nextSide = noButtonLastSide === 'left' ? 'right' : 'left';
      setNoButtonLastSide(nextSide);
      
      const top = Math.random() * 80 + 10; // 10% to 90%
      
      const newPos: React.CSSProperties = {
          position: 'absolute',
          top: `${top}%`,
          transform: `translateY(-50%)`,
          transition: 'top 0.3s ease-out, left 0.3s ease-out, right 0.3s ease-out',
      };

      if (nextSide === 'left') {
          const left = Math.random() * 20 + 5; // 5% to 25% from left edge
          newPos.left = `${left}%`;
          newPos.right = 'auto';
      } else { // right
          const right = Math.random() * 20 + 5; // 5% to 25% from right edge
          newPos.right = `${right}%`;
          newPos.left = 'auto';
      }
      
      setNoButtonPos(newPos);
    }
  };

  const handleNoClick = () => {
    if (step === 'initial') {
      setStep('why');
    }
  };

  const renderContent = () => {
    let title: React.ReactNode = '';
    let buttons: React.ReactNode = null;

    switch (step) {
      case 'initial':
        title = 'Hey wanna play a game ??';
        buttons = (
          <div className="flex gap-4 justify-center animate-in fade-in slide-in-from-bottom-5 duration-500">
            <Button size="lg">Yes</Button>
            <Button size="lg" variant="outline" onClick={handleNoClick}>No</Button>
          </div>
        );
        break;
      
      case 'why':
        title = 'whyyyyyy ???';
        buttons = (
          <div className="relative flex h-[44px] items-center justify-center">
            {showContinueAnimation && !showContinueButton && (
              <>
                <div
                  onAnimationEnd={handleBallAnimationEnd}
                  className="absolute h-4 w-4 rounded-full bg-primary"
                  style={{ animation: 'snake-left-to-center 1.2s ease-in-out forwards' }}
                />
                <div
                  onAnimationEnd={handleBallAnimationEnd}
                  className="absolute h-4 w-4 rounded-full bg-primary"
                  style={{ animation: 'snake-right-to-center 1.2s ease-in-out forwards' }}
                />
              </>
            )}
            {showContinueButton && (
              <div style={{ animation: 'continue-button-appear 0.4s ease-out forwards' }}>
                <Button size="lg" onClick={() => setStep('must_play')}>Continue</Button>
              </div>
            )}
          </div>
        );
        break;

      case 'must_play':
        title = 'You must have to playyyyyy and click yesss only!!!!!! or if you click no button then i will remove the no button';
        buttons = (
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="animate-in fade-in slide-in-from-bottom-5 duration-500">Yes</Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleNoClick}
              onMouseEnter={handleNoHover}
              style={noButtonPos}
              className={cn("animate-in fade-in slide-in-from-bottom-5 duration-500", noButtonPos.position === 'absolute' && 'z-50')}
            >
              No
            </Button>
          </div>
        );
        break;

      case 'help':
        buttons = (
            <div className="flex gap-4 justify-center animate-in fade-in slide-in-from-bottom-5 duration-500">
                <Button size="lg" onClick={() => setStep('chase')}>Help</Button>
            </div>
        );
        break;

      case 'chase':
      case 'caught':
        title = 'You must have to playyyyyy and click yesss only!!!!!! or if you click no button then i will remove the no button';
        buttons = (
            <div className="absolute inset-0 overflow-hidden">
                <Button size="lg" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-120%, -50%)' }}>Yes</Button>
                
                <Hand className="absolute w-12 h-12 text-primary/70 drop-shadow-lg" style={{...handsPos.left, transform: 'scaleX(-1) rotate(-30deg) translate(50%, -50%)', transition: 'top 0.5s ease-out, left 0.5s ease-out'}} />
                <Hand className="absolute w-12 h-12 text-primary/70 drop-shadow-lg" style={{...handsPos.right, transform: 'rotate(30deg) translate(-50%, -50%)', transition: 'top 0.5s ease-out, left 0.5s ease-out'}} />

                <Button
                    id="runaway-no-button"
                    size="lg"
                    variant="outline"
                    onClick={() => { if (step === 'caught') setStep('final'); }}
                    style={runawayPos}
                    disabled={step === 'chase'}
                >
                    No
                </Button>
            </div>
        );
        break;
      
      case 'final':
        title = "Oh dear i did said you that i will remove that button if you try to press it.... so now just go on press no button which gonna fall down from the sky just for you"
        buttons = (
            <div className="relative h-11">
                {showFinalFall && (
                    <Button size="lg" style={{ animation: 'fall-with-wind 1.5s ease-out forwards' }}>
                        Yes
                    </Button>
                )}
            </div>
        )
        break;
    }

    return (
      <div className="text-center p-8 bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-2xl shadow-lg min-h-[160px] flex flex-col justify-between relative">
        {title && <h1 key={step} className="text-xl md:text-2xl font-bold text-primary mb-6 animate-in fade-in zoom-in-95 duration-500">
          {title}
        </h1>}
        <div className="min-h-[44px] flex items-center justify-center">
          {buttons}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-pink-100 dark:bg-pink-950 overflow-hidden">
      <div className="falling-emojis">
        {particles.map(({ id, content, x, delay, duration, type }) => (
          <span
            key={id}
            className={cn(type === 'emoji' ? 'emoji' : 'snowflake')}
            style={{
              left: `${x}vw`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          >
            {content}
          </span>
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full p-4">
        {renderContent()}
      </div>
    </div>
  );
};


export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme, mode, setMode } = useTheme();
  const { showLoader } = useLoading();
  const [showIncompleteProfilePopup, setShowIncompleteProfilePopup] = useState(false);
  
  useEffect(() => {
    setLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            // Immediately redirect if user is not verified and not on the verify page.
            if (!currentUser.emailVerified && window.location.pathname !== '/auth/verify') {
                router.replace('/auth/verify');
                setLoading(false);
                return;
            }

            const userDocRef = doc(db, "users", currentUser.uid);
            const unsubscribeProfile = onSnapshot(userDocRef, 
              (doc) => {
                if (doc.exists()) {
                    const profileData = doc.data() as UserProfile;
                    setProfile(profileData);
                    setShowIncompleteProfilePopup(false);
                    if (profileData.isBestie) {
                      setTheme('pink');
                    }
                } else {
                    // CRITICAL: Auth user exists, but no Firestore doc. This is an inconsistent state. Force logout.
                    if (currentUser.emailVerified) {
                        console.error("CRITICAL: Verified user profile not found in Firestore. Forcing logout.");
                        setShowIncompleteProfilePopup(true);
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
  }, [pathname, router, setTheme]);

  // Secondary effect to enforce the verification guard after initial load.
  useEffect(() => {
    if (!loading && user && !user.emailVerified && pathname !== '/auth/verify') {
        router.replace('/auth/verify');
    }
  }, [loading, user, pathname, router]);
  
  const wallet = profile?.wallet || { deposit: 0, winning: 0, bonus: 0 };
  const totalBalance = wallet.deposit + wallet.winning + wallet.bonus;

  const navLinks = [
    { href: "/", label: "Home" },
    { href: user ? "/tournaments" : "/register", label: "Tournaments" },
  ];
  
  const handleLogout = async () => {
    showLoader();
    setSheetOpen(false);
    await auth.signOut();
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    window.location.href = '/';
  };

  if (profile?.isBestie) {
    return <BestiePage />;
  }

  if (profile?.suspended) {
      return <SuspendedUserPopup onLogout={handleLogout} />;
  }

  const renderThemeSwatches = () => (
    <div className="flex flex-wrap justify-start gap-1 px-1">
      {themes.map((t) => (
        <button
          key={t.name}
          onClick={() => setTheme(t.name)}
          aria-label={`Set ${t.name} theme`}
          className={cn(
            'p-0.5 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-popover',
            `theme-${t.name}` // This scopes the CSS variables for the button
          )}
        >
          {/* This inner div now has access to the scoped variables */}
          <div className={cn(
            'w-5 h-5 rounded-full border-2 p-0.5',
            // Check for active theme and apply a ring using the globally set --primary color
            theme === t.name ? 'border-primary' : 'border-transparent'
          )}>
            {/* This div uses the scoped --primary variable for its background */}
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
             theme === t.name ? 'border-primary' : 'border-muted'
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
        <Button variant="ghost" className="w-full justify-start" disabled><ClipboardList className="mr-2 h-4 w-4" />Orders</Button>
        <Button variant="ghost" className="w-full justify-start" disabled><Gift className="mr-2 h-4 w-4" />Gift Shop</Button>
        
        <Separator className="my-2"/>
        
        <SheetClose asChild>
            <Button variant="ghost" asChild className="w-full justify-start">
                <Link href="/wallet"><Wallet className="mr-2 h-4 w-4" />Wallet</Link>
            </Button>
        </SheetClose>
        <Button variant="ghost" className="w-full justify-start" disabled>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Chat Support</span>
            <span className="ml-auto text-xs">Soon</span>
        </Button>

        {profile && profile.isAdmin === true && <Separator className="my-2"/>}
        {profile && profile.isAdmin === true && (
            <SheetClose asChild>
                <Button variant="ghost" asChild className="w-full justify-start"><Link href="/admin"><Shield className="mr-2 h-4 w-4" />Admin Panel</Link></Button>
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

  return (
    <>
       {showIncompleteProfilePopup && (
        <Dialog open={true}>
          <DialogContent
            className="sm:max-w-md"
            onInteractOutside={(e) => e.preventDefault()}
            hideCloseButton={true}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl text-destructive">
                <AlertTriangle className="h-6 w-6" />
                Account Error
              </DialogTitle>
              <DialogDescription className="pt-4 text-base">
                Your user account data could not be found. This can happen if registration was interrupted. You will be logged out to resolve this issue. Please try logging in again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end pt-4">
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

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
              ) : user && user.emailVerified && profile ? (
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
                      ) : user && user.emailVerified && profile ? (
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






