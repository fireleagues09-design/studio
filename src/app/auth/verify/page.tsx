
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, isSignInWithEmailLink } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useLoading } from '@/context/LoadingContext';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function VerifyPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { hideLoader, showLoader } = useLoading();
    
    const [status, setStatus] = useState('loading'); // 'loading', 'waiting', 'verifying', 'success', 'error'
    const [errorMessage, setErrorMessage] = useState('');
    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds

    // Countdown timer effect for the 'waiting' state
    useEffect(() => {
        if (status === 'waiting') {
            if (timeLeft <= 0) {
                setStatus('error');
                setErrorMessage('Your registration session has expired. Please try signing up again.');
                window.localStorage.removeItem('registrationDetails');
                return;
            }

            const timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [status, timeLeft]);

    // Main effect to handle verification
    useEffect(() => {
        const verifyAndRegister = async () => {
            if (!isSignInWithEmailLink(auth, window.location.href)) {
                // This means we are in the 'waiting' state
                if (window.localStorage.getItem('registrationDetails')) {
                    setStatus('waiting');
                } else {
                    // User landed here without starting registration
                    setStatus('error');
                    setErrorMessage('Invalid verification link or session. Please start the registration process again.');
                }
                hideLoader();
                return;
            }

            // This means the user clicked the link and is back. Start auto-verification.
            setStatus('verifying');
            showLoader();

            const registrationDetailsString = window.localStorage.getItem('registrationDetails');
            if (!registrationDetailsString) {
                setErrorMessage('Your registration session could not be found. Please try again.');
                setStatus('error');
                hideLoader();
                return;
            }
            
            let registrationData;
            try {
              registrationData = JSON.parse(registrationDetailsString);
            } catch (e) {
              setErrorMessage('Your registration session data is corrupted. Please try signing up again.');
              setStatus('error');
              hideLoader();
              window.localStorage.removeItem('registrationDetails');
              return;
            }

            const { email, password, inGameName } = registrationData;

            if (!email || !password || !inGameName) {
                setErrorMessage('Incomplete registration data. Please start over.');
                setStatus('error');
                hideLoader();
                return;
            }
            
            try {
                // Step 1: Create the user with their chosen password
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Step 2: Create their Firestore document
                const userData = {
                    inGameName,
                    email: user.email,
                    wallet: { deposit: 0, winning: 0, bonus: 0 },
                    registeredOn: serverTimestamp(),
                    isRegistered: true, // Mark as fully registered
                    emailVerified: true, // Mark email as verified
                };
                await setDoc(doc(db, "users", user.uid), userData);

                // Step 3: Clean up and redirect
                window.localStorage.removeItem('registrationDetails');
                toast({
                    title: 'Welcome!',
                    description: 'Your account has been successfully created and verified!',
                });
                
                setStatus('success');
                router.push('/'); // Redirect to home
            } catch (error: any) {
                console.error("Verification/Registration error:", error);
                let msg = 'An unexpected error occurred. Please try again.';
                if (error.code === 'auth/email-already-in-use') {
                    msg = 'This email is already registered. Please log in.';
                }
                setErrorMessage(msg);
                setStatus('error');
                hideLoader();
            }
        };

        verifyAndRegister();
    }, [router, toast, hideLoader, showLoader]);

    const handleCancel = () => {
        window.localStorage.removeItem('registrationDetails');
        router.push('/register');
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    const renderContent = () => {
        switch (status) {
            case 'waiting':
                return (
                    <>
                        <CardTitle className="text-2xl">Check Your Email</CardTitle>
                        <CardDescription>We've sent a verification link to complete your registration. This link is valid for 3 minutes.</CardDescription>
                        <div className="py-4 text-center">
                            <p className="text-4xl font-bold font-mono text-primary">{formatTime(timeLeft)}</p>
                            <p className="text-sm text-muted-foreground">Time Remaining</p>
                        </div>
                        <p className="text-xs text-center text-muted-foreground">Please click the link in your email. This page will automatically verify you once the link is opened.</p>
                         <Button variant="outline" className="w-full mt-6" onClick={handleCancel}>
                            Cancel
                        </Button>
                    </>
                );
            case 'verifying':
                return (
                    <>
                        <CardTitle className="text-2xl">Verifying...</CardTitle>
                        <CardDescription>Please wait while we verify your email and set up your account.</CardDescription>
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    </>
                );
            case 'error':
                 return (
                    <>
                        <CardTitle className="text-2xl text-destructive">Registration Failed</CardTitle>
                        <CardDescription>{errorMessage}</CardDescription>
                        <Button className="w-full mt-6" onClick={() => router.push('/register')}>
                            Back to Registration
                        </Button>
                    </>
                );
            case 'success':
                 return (
                    <>
                        <CardTitle className="text-2xl">Success!</CardTitle>
                        <CardDescription>Redirecting you to the homepage...</CardDescription>
                         <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    </>
                );
            default: // loading
                 return (
                    <>
                        <CardTitle className="text-2xl">Loading...</CardTitle>
                        <CardDescription>Initializing registration session.</CardDescription>
                         <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background text-foreground py-12 px-4">
            <Card className="w-full max-w-sm mx-auto bg-card border-border shadow-lg">
                <CardHeader className="text-center">
                    {renderContent()}
                </CardHeader>
            </Card>
        </div>
    );
}
