
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { User, KeySquare, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

type UserProfile = {
    inGameName: string;
    phone: string;
    email: string;
};

export default function ProfilePage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [inGameName, setInGameName] = useState('');
    const [editLoading, setEditLoading] = useState(false);

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
                        setInGameName(profileData.inGameName);
                    } else {
                        console.error("User profile not found in Firestore.");
                        router.push('/login');
                    }
                    setLoading(false);
                });
                return () => unsubProfile();
            } else {
                router.push('/login');
            }
        });

        return () => unsubscribe();
    }, [router]);

    const handleUpdateName = async () => {
        if (!user || !inGameName) {
            toast({ title: 'Error', description: 'In-game name cannot be empty.', variant: 'destructive' });
            return;
        }
        setEditLoading(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                inGameName: inGameName
            });
            toast({ title: 'Success', description: 'Your in-game name has been updated.' });
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating name:', error);
            toast({ title: 'Error', description: 'Failed to update your name. Please try again.', variant: 'destructive' });
        } finally {
            setEditLoading(false);
        }
    };
    
    const handleLogout = async () => {
        await auth.signOut();
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/');
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
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">My Profile</CardTitle>
                    <CardDescription>View and manage your account details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="in-game-name">In-Game Name</Label>
                         <div className="flex items-center gap-2">
                            <Input id="in-game-name" value={inGameName} onChange={(e) => setInGameName(e.target.value)} disabled={!isEditing || editLoading} />
                            {!isEditing ? (
                                <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}><Pencil className="h-4 w-4"/></Button>
                            ) : (
                                <Button onClick={handleUpdateName} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save'}</Button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <p className="text-muted-foreground">{profile.phone}</p>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end items-center bg-secondary/50 p-6 rounded-b-lg">
                    <Button variant="ghost" onClick={handleLogout}>Logout</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
