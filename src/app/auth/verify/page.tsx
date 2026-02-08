'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser, sendEmailVerification, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useLoading } from '@/context/LoadingContext';
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailCheck } from 'lucide-react';
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
import { doc, setDoc } from 'firebase/firestore';

export default function VerifyPage() {
    const router = useRouter();
    const { showLoader, hideLoader } = useLoading();
    const { toast } = useToast();

    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
    
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const verificationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    
    const cleanupUser = useCallback(async (targetUser: FirebaseUser) => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (verificationIntervalRef.current) clearInterval(verificationIntervalRef.current);

        // The `auth/requires-recent-login` error prevents us from deleting the user here on the client-side
        // without forcing the user to re-authenticate, which is a poor UX.
        // Instead, we will just sign them out. The robust login/registration flow is designed to handle
        // this "unverified" user account if they try to sign in or register again later.
        await signOut(auth);

    }, []);


    useEffect(() => {
        hideLoader();

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                // If a user lands here but is already verified, send them to the homepage.
                if (currentUser.emailVerified) {
                    router.replace('/');
                    return;
                }
                setUser(currentUser);
            } else {
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
             verificationIntervalRef.current = setInterval(async () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    await currentUser.reload();
                    if (currentUser.emailVerified) {
                        if (verificationIntervalRef.current) clearInterval(verificationIntervalRef.current);
                        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                        
                        showLoader();

                        toast({
                            title: "Verification Successful!",
                            description: "Welcome! Creating your profile now...",
                        });
                        
                        const userDocRef = doc(db, 'users', currentUser.uid);
                        try {
                             await setDoc(userDocRef, {
                                username: currentUser.displayName,
                                email: currentUser.email,
                                isRegistered: true,
                                emailVerified: true,
                                wallet: { deposit: 0, winning: 0, bonus: 0 },
                                registeredOn: new Date(),
                            });
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
                    }
                }
            }, 3000); 

            timerIntervalRef.current = setInterval(() => {
                setTimeLeft(prevTime => prevTime - 1);
            }, 1000);
        }
        
        return () => {
            if (verificationIntervalRef.current) clearInterval(verificationIntervalRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }

    }, [user, router, toast, showLoader, hideLoader]);
    

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

                showLoader();
                try {
                    const currentUser = auth.currentUser;
                    if (currentUser && !currentUser.emailVerified) {
                        await signOut(auth);
                    }
                    router.replace('/register');
                } catch (error) {
                    console.error("Error during timeout cleanup:", error);
                    hideLoader();
                }
            };
            handleTimeout();
        }
    }, [timeLeft, router, toast, showLoader, hideLoader]);

    const handleResend = async () => {
        if (!user) return;
        showLoader();
        try {
            await sendEmailVerification(user);
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
        }
    }
    
    const handleCancel = async () => {
        showLoader();
        try {
            await signOut(auth);
            router.replace('/');
        } catch (error) {
            console.error("Error on cancel sign out:", error);
            hideLoader();
            toast({ title: "Error", description: "Could not cancel registration. Please try again.", variant: "destructive"});
        }
    }

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

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
                        The page will automatically redirect once your email is verified.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button onClick={handleResend} className="w-full">
                        Resend Verification Link
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full">Cancel Registration</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will cancel your registration process. You can always sign up again later.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Go Back</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancel} className="bg-destructive hover:bg-destructive/90">
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
