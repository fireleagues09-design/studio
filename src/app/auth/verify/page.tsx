'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser, sendEmailVerification, signOut, deleteUser } from 'firebase/auth';
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
import { deleteDoc, doc } from 'firebase/firestore';


export default function VerifyPage() {
    const router = useRouter();
    const { hideLoader } = useLoading();
    const { toast } = useToast();

    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
    const [isResending, setIsResending] = useState(false);
    
    // Using refs for intervals to easily clear them from anywhere
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const verificationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    
    const cleanupUser = useCallback(async (targetUser: FirebaseUser) => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (verificationIntervalRef.current) clearInterval(verificationIntervalRef.current);

        try {
            // Delete Firestore doc first
            await deleteDoc(doc(db, "users", targetUser.uid));
        } catch (error) {
             console.error("Failed to delete user document during cleanup:", error);
        }

        try {
            // Then delete auth user
            await deleteUser(targetUser);
        } catch (error) {
             console.error("Failed to delete auth user during cleanup:", error);
        }
        
        await signOut(auth);

    }, []);


    useEffect(() => {
        hideLoader();

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                // If no one is logged in, they shouldn't be here.
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
             // --- Verification Checker ---
             verificationIntervalRef.current = setInterval(async () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    await currentUser.reload();
                    if (currentUser.emailVerified) {
                        if (verificationIntervalRef.current) clearInterval(verificationIntervalRef.current);
                        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                        toast({
                            title: "Verification Successful!",
                            description: "Welcome! Redirecting you now...",
                        });
                        // Redirect to home, which will then handle pushing to complete-profile if needed.
                        router.replace('/');
                    }
                }
            }, 3000); // Check every 3 seconds

            // --- Countdown Timer ---
            timerIntervalRef.current = setInterval(() => {
                setTimeLeft(prevTime => prevTime - 1);
            }, 1000);
        }
        
        return () => {
            if (verificationIntervalRef.current) clearInterval(verificationIntervalRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }

    }, [user, router, toast]);
    

    useEffect(() => {
        if (timeLeft <= 0) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (verificationIntervalRef.current) clearInterval(verificationIntervalRef.current);
            
            toast({
                title: "Time Out",
                description: "Verification time expired. Please register again.",
                variant: 'destructive'
            });

            // Clean up the unverified user before redirecting
            const currentUser = auth.currentUser;
            if (currentUser && !currentUser.emailVerified) {
                 cleanupUser(currentUser).then(() => {
                     router.replace('/register');
                 });
            } else {
                 router.replace('/register');
            }
        }
    }, [timeLeft, router, toast, cleanupUser]);

    const handleResend = async () => {
        if (!user) return;
        setIsResending(true);
        try {
            await sendEmailVerification(user);
            toast({
                title: "Link Sent!",
                description: "A new verification link has been sent to your email.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to send a new link. Please try again in a moment.",
                variant: "destructive"
            });
        } finally {
            setIsResending(false);
        }
    }
    
    const handleCancel = async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            await cleanupUser(currentUser);
        }
        router.replace('/');
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
                    <Button onClick={handleResend} className="w-full" disabled={isResending}>
                        {isResending ? 'Sending...' : 'Resend Verification Link'}
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full">Cancel Registration</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will cancel your registration process. Your account details will be deleted and you will need to sign up again.
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
