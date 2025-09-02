
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { User, KeySquare, Pencil, Fingerprint, Users, PlusCircle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { Team, TeamMember } from '@/lib/mock-data';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateTeam } from './actions';


type UserProfile = {
    inGameName: string;
    inGameUid: string;
    phone: string;
    email: string;
    team?: Team;
};

function EditTeamDialog({ user, profile }: { user: FirebaseUser, profile: UserProfile }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [teamName, setTeamName] = useState(profile.team?.name || '');
    const [teamType, setTeamType] = useState<'Duo' | 'Squad'>(profile.team?.type || 'Duo');
    const [teammates, setTeammates] = useState<TeamMember[]>(profile.team?.members || []);
    const { toast } = useToast();

    useEffect(() => {
        // Reset form when dialog opens
        if (open) {
            const currentTeam = profile.team;
            setTeamName(currentTeam?.name || '');
            setTeamType(currentTeam?.type || 'Duo');
            const initialMembers = currentTeam?.members || [];
            
            const maxMembers = (currentTeam?.type || 'Duo') === 'Duo' ? 1 : 3;
            const filledMembers = Array(maxMembers).fill(null).map((_, i) => initialMembers[i] || { inGameName: '', inGameUid: '' });
            setTeammates(filledMembers);
        }
    }, [open, profile]);

    const handleMemberChange = (index: number, field: 'inGameName' | 'inGameUid', value: string) => {
        const newTeammates = [...teammates];
        newTeammates[index] = { ...newTeammates[index], [field]: value };
        setTeammates(newTeammates);
    };
    
    const handleTypeChange = (type: 'Duo' | 'Squad') => {
        setTeamType(type);
        const maxMembers = type === 'Duo' ? 1 : 3;
        // Keep existing members up to the new limit
        const currentMembers = teammates.slice(0, maxMembers);
        // Pad with empty members if needed
        const filledMembers = Array(maxMembers).fill(null).map((_, i) => currentMembers[i] || { inGameName: '', inGameUid: '' });
        setTeammates(filledMembers);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const idToken = await user.getIdToken();
            const teamData: Team = {
                name: teamName,
                type: teamType,
                members: teammates // Save all members, even if empty, to preserve structure
            };
            const result = await updateTeam(idToken, teamData);
            if (result.success) {
                toast({
                    title: 'Success',
                    description: 'Your team has been updated.'
                });
                setOpen(false);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error("Error updating team:", error);
            toast({
                title: 'Error',
                description: 'Failed to update team. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };
    
    const teammateFields = Array.from({ length: teamType === 'Duo' ? 1 : 3 });
    const hasTeam = profile.team && profile.team.members.some(m => m.inGameName && m.inGameUid);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Pencil className="mr-2 h-4 w-4" />
                    {hasTeam ? 'Edit Team' : 'Create Team'}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{hasTeam ? 'Edit Team' : 'Create Your Team'}</DialogTitle>
                    <DialogDescription>
                        Manage your team members for Duo and Squad tournaments.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
                     <div className="grid gap-2">
                        <Label htmlFor="team-name">Team Name (Optional)</Label>
                        <Input id="team-name" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. The Champions" />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="team-type">Team Type</Label>
                        <Select value={teamType} onValueChange={(value: 'Duo' | 'Squad') => handleTypeChange(value)}>
                           <SelectTrigger id="team-type"><SelectValue /></SelectTrigger>
                           <SelectContent>
                               <SelectItem value="Duo">Duo</SelectItem>
                               <SelectItem value="Squad">Squad</SelectItem>
                           </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-4">
                        <Label>Teammates</Label>
                        {teammateFields.map((_, index) => (
                           <div key={index} className="p-4 border rounded-md space-y-3 bg-secondary/50">
                               <p className="text-sm font-medium">Teammate {index + 1}</p>
                               <div className="grid gap-2">
                                   <Label htmlFor={`tm-name-${index}`}>In-Game Name</Label>
                                   <Input id={`tm-name-${index}`} value={teammates[index]?.inGameName || ''} onChange={e => handleMemberChange(index, 'inGameName', e.target.value)} />
                               </div>
                                <div className="grid gap-2">
                                   <Label htmlFor={`tm-uid-${index}`}>In-Game UID</Label>
                                   <Input id={`tm-uid-${index}`} value={teammates[index]?.inGameUid || ''} onChange={e => handleMemberChange(index, 'inGameUid', e.target.value)} />
                               </div>
                           </div>
                        ))}
                    </div>

                    <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-4 px-4 border-t">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Team'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

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

    const hasTeamMembers = profile.team && profile.team.members.some(m => m.inGameName && m.inGameUid);

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

            <Card>
                <CardHeader>
                    <CardTitle>My Team</CardTitle>
                    <CardDescription>Your registered Duo or Squad teammates.</CardDescription>
                </CardHeader>
                <CardContent>
                    {hasTeamMembers ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg">{profile.team?.name || `${profile.team?.type} Team`}</h3>
                                <Badge variant="secondary">{profile.team?.type}</Badge>
                            </div>
                            <ul className="space-y-3">
                                {profile.team?.members.filter(m => m.inGameName && m.inGameUid).map((member, index) => (
                                    <li key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                                        <div className="font-medium">{member.inGameName}</div>
                                        <div className="text-sm text-muted-foreground">UID: {member.inGameUid}</div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="mx-auto h-8 w-8 mb-2" />
                            <p>You haven't registered a team yet.</p>
                            <p className="text-xs">Please contact support to create or join a team.</p>
                        </div>
                    )}
                </CardContent>
                 <CardFooter className="bg-secondary/50 p-4 rounded-b-lg">
                    <p className="text-xs text-muted-foreground text-center w-full">To change team members please contact players support</p>
                </CardFooter>
            </Card>

        </div>
    );
}

    
