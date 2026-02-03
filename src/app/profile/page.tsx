
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { User, KeySquare, Pencil, Fingerprint, Users, PlusCircle, Trash2, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { Team, TeamMember } from '@/lib/mock-data';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type UserProfile = {
    inGameName: string;
    inGameUid: string;
    phone: string;
    email: string;
    duoTeam?: Team;
    squadTeam?: Team;
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

    if (loading || !user || !profile) {
        return (
            <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl space-y-8">
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
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-5 w-48" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    const renderTeamDetails = (team: Team | undefined, teamType: 'Duo' | 'Squad') => {
        const hasTeam = team && team.members && team.members.length > 0;

        if (!hasTeam) {
            return (
                <div className="text-center py-8 text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-2" />
                    <p>You haven't registered a {teamType} team yet.</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{team?.name !== 'N/A' ? team?.name : `${teamType} Team`}</h3>
                </div>
                <ul className="space-y-3">
                    {team?.members.map((member, index) => (
                        <li key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                            <div className="font-medium">{member.inGameName}</div>
                            <div className="text-sm text-muted-foreground">UID: {member.inGameUid}</div>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };


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

            <Card>
                <CardHeader>
                    <CardTitle>My Teams</CardTitle>
                    <CardDescription>Your registered Duo & Squad teammates.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="duo" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="duo">Duo</TabsTrigger>
                            <TabsTrigger value="squad">Squad</TabsTrigger>
                        </TabsList>
                        <TabsContent value="duo" className="mt-4">
                            {renderTeamDetails(profile.duoTeam, 'Duo')}
                        </TabsContent>
                        <TabsContent value="squad" className="mt-4">
                            {renderTeamDetails(profile.squadTeam, 'Squad')}
                        </TabsContent>
                    </Tabs>
                </CardContent>
                 <CardFooter className="bg-secondary/50 p-4 rounded-b-lg mt-6">
                    <p className="text-xs text-muted-foreground text-center w-full">To change team members please contact players support</p>
                </CardFooter>
            </Card>

        </div>
    );
}
