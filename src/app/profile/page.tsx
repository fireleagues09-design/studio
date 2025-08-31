
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { User as UserIcon, Phone, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";

type UserProfile = {
    inGameName: string;
    phone: string;
    email: string;
};

export default function ProfilePage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [inGameName, setInGameName] = useState('');
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const profileData = userDoc.data() as UserProfile
                    setProfile(profileData);
                    setInGameName(profileData.inGameName);
                } else {
                    console.error("User profile not found in Firestore.");
                    router.push('/login');
                }
            } else {
                router.push('/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    const handleUpdateName = async () => {
        if (!user || !inGameName.trim()) {
            toast({ title: "Error", description: "In-game name cannot be empty.", variant: "destructive" });
            return;
        }
        if (inGameName === profile?.inGameName) {
            toast({ title: "Info", description: "No changes to save." });
            return;
        }

        setUpdating(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                inGameName: inGameName
            });
            setProfile(prevProfile => prevProfile ? { ...prevProfile, inGameName } : null);
            toast({ title: "Success", description: "In-game name updated successfully!" });
        } catch (error) {
            console.error("Error updating name:", error);
            toast({ title: "Error", description: "Failed to update name. Please try again.", variant: "destructive" });
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                             <Skeleton className="h-4 w-24" />
                             <Skeleton className="h-10 w-full" />
                        </div>
                         <div className="space-y-2">
                             <Skeleton className="h-4 w-24" />
                             <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                     <CardFooter>
                        <Skeleton className="h-10 w-32" />
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl text-center">
                <p>Could not load user profile.</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
            <div className="flex flex-col gap-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={`https://api.dicebear.com/8.x/bottts/svg?seed=${user?.uid}`} />
                                <AvatarFallback>{profile.inGameName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-3xl">{profile.inGameName}</CardTitle>
                                <CardDescription>Manage your profile and account settings.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="in-game-name" className="flex items-center gap-2 text-muted-foreground"><UserIcon className="h-4 w-4" /> In-Game Name</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="in-game-name" value={inGameName} onChange={(e) => setInGameName(e.target.value)} />
                                    <Button onClick={handleUpdateName} disabled={updating || inGameName === profile.inGameName}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {updating ? 'Saving...' : 'Save'}
                                    </Button>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone" className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> Phone Number</Label>
                                <Input id="phone" value={profile.phone} readOnly />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
