
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useLoading } from '@/context/LoadingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { setUsername } from '@/app/profile/actions';
import { LogOut } from 'lucide-react';

export default function CompleteProfilePage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [username, setUsernameState] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    
    const router = useRouter();
    const { hideLoader } = useLoading();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                // If not logged in, they shouldn't be here.
                router.push('/login');
            }
            setAuthLoading(false);
            hideLoader();
        });
        return () => unsubscribe();
    }, [router, hideLoader]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);
        try {
            const idToken = await user.getIdToken();
            const result = await setUsername(idToken, username);

            if (result.success) {
                toast({
                    title: 'Profile Complete!',
                    description: 'Welcome to FireLeagues!',
                });
                router.push('/');
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Could not set username.',
                variant: 'destructive',
            });
             setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await auth.signOut();
            toast({ title: "Logged Out", description: "You have been successfully logged out." });
            router.push('/login');
        } catch (error: any) {
             toast({
                title: 'Error',
                description: error.message || 'Could not log out.',
                variant: 'destructive',
            });
            setIsLoggingOut(false);
        }
    };

    const anyLoading = isSaving || isLoggingOut;

    if (authLoading) {
        return null;
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background text-foreground py-12 px-4">
            <Card className="w-full max-w-sm mx-auto">
                <CardHeader>
                    <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
                    <CardDescription>
                        Choose a unique in-game name to continue. This cannot be changed later.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsernameState(e.target.value)}
                                placeholder="6-12 characters"
                                required
                                disabled={anyLoading}
                            />
                            <p className="text-xs text-muted-foreground">Must be 6-12 characters long, letters and numbers only.</p>
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                            <Button type="submit" disabled={anyLoading} className="w-full">
                                {isSaving ? 'Saving...' : 'Save and Continue'}
                            </Button>
                            <Button type="button" variant="outline" onClick={handleLogout} disabled={anyLoading} className="w-full">
                                {isLoggingOut ? 'Logging out...' : (
                                    <>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Logout
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
