
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { User, KeySquare, Pencil, Fingerprint, Users, PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

type UserProfile = {
    inGameName: string;
    inGameUid: string;
    phone: string;
    email: string;
};

export default function ProfilePage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();
    const { toast } = useToast();

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
                        console.error("User profile not found in Firestore.");
                        router.push('/login');
                    }
                    setLoading(false);
                });

                return () => {
                    unsubProfile();
                };
            } else {
                router.push('/login');
            }
        });

        return () => unsubscribe();
    }, [router]);
    
    const handleLogout = async () => {
        await auth.signOut();
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        window.location.href = '/';
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-5 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                    <CardFooter className="flex justify-between">
                         <Skeleton className="h-10 w-24" />
                         <Skeleton className="h-10 w-24" />
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if (!profile) {
        return (
             <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl text-center">
                <p>Could not load profile information.</p>
            </div>
        )
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
                        <Label htmlFor="in-game-name">In-Game Name</Label>
                         <div className="flex items-center gap-2">
                            <Input id="in-game-name" value={profile.inGameName} disabled />
                        </div>
                        <p className="text-xs text-muted-foreground pt-1">To change your in-game name, please contact player support.</p>
                    </div>
                     <div className="space-y-2">
                        <Label>In-Game UID</Label>
                        <div className="flex items-center gap-2 text-muted-foreground border p-2 rounded-md bg-secondary/50">
                           <Fingerprint className="h-4 w-4" />
                           <p>{profile.inGameUid || 'Not set'}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <p className="text-muted-foreground">{profile.phone}</p>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end items-center bg-secondary/50 p-4 rounded-b-lg">
                    <Button variant="ghost" onClick={handleLogout}>Logout</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
