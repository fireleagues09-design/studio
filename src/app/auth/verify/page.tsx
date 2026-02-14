
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser, sendEmailVerification, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useLoading } from '@/context/LoadingContext';
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export default function VerifyPage() {
    const router = useRouter();
    const { showLoader, hideLoader } = useLoading();
    const { toast } = useToast();

    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
    const [isResending, setIsResending] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const verificationIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // This function handles the final step of creating the user's profile document.
    const handleRegistrationCompletion = useCallback(async (userToRegister: FirebaseUser) => {
        if (verificationIntervalRef.current) clearInterval(verificationIntervalRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        
        showLoader();

        const userDocRef = doc(db, 'users', userToRegister.uid);
        try {
            // Check if the document already exists to prevent overwriting.
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                toast({
                    title: "Verification Successful!",
                    description: "Welcome! Creating your profile now...",
                });
                await setDoc(userDocRef, {
                    username: userToRegister.displayName,
                    email: userToRegister.email,
                    isRegistered: true,
                    emailVerified: true,
                    wallet: { deposit: 0, winning: 0, bonus: 0 },
                    registeredOn: serverTimestamp(),
                });
            } else {
                 toast({
                    title: "Welcome Back!",
                    description: "Your account is verified and ready.",
                });
            }
            router.replace('/');
        } catch (dbError) {
             console.error("Failed to create user document after verification:", dbError);
             toast({
                title: "Profile Creation Failed",
                description: "Your email is verified, but we couldn't create your profile. Please contact support.",
                variant: "destructive"
             });
             hideLoader();
             await signOut(auth);
             router.replace('/login');
        }
    }, [router, showLoader, hideLoader, toast]);


    useEffect(() => {
        hideLoader();

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                // If there's no user, they should not be on this page.
                router.replace('/login');
            }
        });
        
        return () => {
            unsubscribeAuth();
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (verificationIntervalRef.current) clearInterval(verificationIntervalRef.current);
        };
    }, [router, hideLoader]);


    useEffect(() => {
        if (user) {
             // Start checking for email verification every 3 seconds.
             verificationIntervalRef.current = setInterval(async () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    await currentUser.reload();
                    if (currentUser.emailVerified) {
                        // Once verified, stop checking and complete registration.
                        await handleRegistrationCompletion(currentUser);
                    }
                }
            }, 3000); 

            // Start the countdown timer.
            timerIntervalRef.current = setInterval(() => {
                setTimeLeft(prevTime => prevTime > 0 ? prevTime - 1 : 0);
            }, 1000);
        }
        
        return () => {
            if (verificationIntervalRef.current) clearInterval(verificationIntervalRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }

    }, [user, handleRegistrationCompletion]);
    

    useEffect(() => {
        if (timeLeft <= 0) {
            const handleTimeout = async () => {
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                if (verificationIntervalRef.current) clearInterval(verificationIntervalRef.current);
                
                toast({
                    title: "Time Out",
                    description: "Verification time expired. Please register again.",
                    variant: 'destructive'
                });

                try {
                    const currentUser = auth.currentUser;
                    if (currentUser && !currentUser.emailVerified) {
                        await currentUser.delete(); // Delete unverified user from Auth
                    }
                    await signOut(auth); // Sign out any lingering session
                    router.replace('/register');
                } catch (error) {
                    console.error("Error during timeout cleanup:", error);
                    hideLoader();
                    // Still sign out and redirect even if deletion fails.
                    await signOut(auth);
                    router.replace('/register');
                }
            };
            handleTimeout();
        }
    }, [timeLeft, router, toast, hideLoader]);

    const handleResend = async () => {
        if (!user || isResending) return;
        
        setIsResending(true);
        showLoader();

        try {
            const actionCodeSettings = {
                url: `${window.location.origin}/profile`,
                handleCodeInApp: true,
            };
            await sendEmailVerification(user, actionCodeSettings);
            toast({
                title: "Link Sent!",
                description: "A new verification link has been sent to your email.",
            });
        } catch (error: any) {
            let description = "Failed to send a new link. Please try again in a moment.";
            if (error.code === 'auth/too-many-requests') {
                description = "You've requested a new link too recently. Please wait a few minutes before trying again."
            }
            toast({
                title: "Error",
                description: description,
                variant: "destructive"
            });
        } finally {
            hideLoader();
            setIsResending(false);
        }
    }
    
    const handleCancel = async () => {
        if (isCanceling || !auth.currentUser) return;

        setIsCanceling(true);
        showLoader();

        try {
            // Delete the unverified user from Firebase Auth to allow them to re-register.
            await auth.currentUser.delete();
            await signOut(auth); // This might be redundant but ensures clean state.
            router.replace('/');
        } catch (error) {
            console.error("Error on cancel registration:", error);
            hideLoader();
            setIsCanceling(false);
            toast({ title: "Error", description: "Could not cancel registration. Please try again.", variant: "destructive"});
        }
    }

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    if (!user) {
        return null;
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background text-foreground py-12 px-4">
            <Card className="w-full max-w-md mx-auto bg-card border-border shadow-lg">
                <CardHeader className="text-center items-center">
                    <MailCheck className="h-16 w-16 text-primary mb-4" />
                    <CardTitle className="text-2xl">Check Your Email</CardTitle>
                    <CardDescription>
                        We've sent a verification link to your email address. Please click the link to activate your account.
                         <span className="block pt-2 font-medium">
                            If you don't see it, please check your spam folder.
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <div className="text-lg font-mono text-muted-foreground">
                        Time left: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        This page will automatically redirect once your email is verified.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button onClick={handleResend} className="w-full" disabled={isResending}>
                        {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isResending ? 'Sending...' : 'Resend Verification Link'}
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full" disabled={isCanceling}>
                                {isCanceling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Cancel Registration
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will cancel your registration process and delete your unverified account. You can sign up again later.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancel} className="bg-destructive hover:bg-destructive/90" disabled={isCanceling}>
                                    {isCanceling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Yes, Cancel
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </div>
    );
}
