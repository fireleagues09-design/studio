'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { User, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { useLoading } from '@/context/LoadingContext';


type UserProfile = {
    username: string;
    email: string;
};

export default function ProfilePage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();
    const { toast } = useToast();
    const { hideLoader } = useLoading();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const unsubProfile = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        const profileData = doc.data() as UserProfile;
                        setProfile(profileData);
                    } else {
                        console.warn("User profile document not found. This may be a temporary state during registration.");
                        setProfile(null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching profile:", error);
                    setLoading(false);
                });

                return () => unsubProfile();
            } else {
                router.push('/login');
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);
    
    useEffect(() => {
        if (!loading) {
            hideLoader();
        }
    }, [loading, hideLoader]);

    const handleLogout = async () => {
        await auth.signOut();
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        window.location.href = '/';
    };

    if (loading || !user) {
        return null;
    }
    
    if (!profile) {
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">My Profile</CardTitle>
                    <CardDescription>View and manage your account details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                         <div className="flex items-center gap-2">
                            <Input id="username" value={profile.username} disabled />
                        </div>
                        <p className="text-xs text-muted-foreground pt-1">This is your unique FireLeagues username. It cannot be changed.</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="flex items-center gap-2 text-muted-foreground border p-2 rounded-md bg-secondary/50">
                           <Mail className="h-4 w-4" />
                           <p>{profile.email}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end items-center bg-secondary/50 p-4 rounded-b-lg">
                    <Button variant="ghost" onClick={handleLogout}>Logout</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
