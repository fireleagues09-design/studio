
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { User, Mail, Gamepad2, Hash, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { useLoading } from '@/context/LoadingContext';
import { updateInGameDetails } from './actions';


type UserProfile = {
    username: string;
    inGameName?: string;
    inGameUid?: string;
    email: string;
};

export default function ProfilePage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [inGameName, setInGameName] = useState('');
    const [inGameUid, setInGameUid] = useState('');
    const [isSavingDetails, setIsSavingDetails] = useState(false);

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
                        setInGameName(profileData.inGameName || '');
                        setInGameUid(profileData.inGameUid || '');
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

    const handleDetailsSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSavingDetails(true);

        try {
            const idToken = await user.getIdToken();
            const result = await updateInGameDetails(idToken, { inGameName, inGameUid });

            if(result.success) {
                toast({
                    title: 'Success!',
                    description: result.message
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Could not save details.',
                variant: 'destructive'
            });
        } finally {
            setIsSavingDetails(false);
        }
    }

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
                    
                    <form onSubmit={handleDetailsSave} className="space-y-4 pt-6 border-t">
                        <h3 className="text-lg font-semibold">Game Details</h3>
                         <div className="space-y-2">
                            <Label htmlFor="in-game-name">In-Game Name</Label>
                            <div className="flex items-center gap-2">
                                <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                                <Input 
                                    id="in-game-name" 
                                    value={inGameName} 
                                    onChange={(e) => setInGameName(e.target.value)} 
                                    placeholder="Your name in Free Fire"
                                    disabled={isSavingDetails}
                                />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="in-game-uid">In-Game UID</Label>
                            <div className="flex items-center gap-2">
                                <Hash className="h-5 w-5 text-muted-foreground" />
                                <Input 
                                    id="in-game-uid" 
                                    value={inGameUid} 
                                    onChange={(e) => setInGameUid(e.target.value)} 
                                    placeholder="Your unique ID in Free Fire"
                                    disabled={isSavingDetails}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSavingDetails}>
                                {isSavingDetails ? 'Saving...' : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Details
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>

                </CardContent>
                <CardFooter className="flex justify-end items-center bg-secondary/50 p-4 rounded-b-lg">
                    <Button variant="ghost" onClick={handleLogout}>Logout</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
