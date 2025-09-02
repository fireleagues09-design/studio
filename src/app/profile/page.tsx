
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createTeam } from './actions';
import { Badge } from '@/components/ui/badge';

type UserProfile = {
    inGameName: string;
    inGameUid: string;
    phone: string;
    email: string;
};

type Teammate = {
    inGameName: string;
    inGameUid: string;
};

type Team = {
    id: string;
    teamName: string;
    category: 'Duo' | 'Squad';
    members: Teammate[];
}

function CreateTeamDialog() {
    const [teamName, setTeamName] = useState('');
    const [category, setCategory] = useState<'Duo' | 'Squad'>('Duo');
    const [members, setMembers] = useState<Teammate[]>([{ inGameName: '', inGameUid: '' }]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (category === 'Duo') {
            setMembers([{ inGameName: '', inGameUid: '' }]);
        } else { // Squad
            setMembers([{ inGameName: '', inGameUid: '' }, { inGameName: '', inGameUid: '' }]);
        }
    }, [category]);

    const handleMemberChange = (index: number, field: keyof Teammate, value: string) => {
        const newMembers = [...members];
        newMembers[index][field] = value;
        setMembers(newMembers);
    };

    const addMemberField = () => {
        if (category === 'Squad' && members.length < 3) {
            setMembers([...members, { inGameName: '', inGameUid: '' }]);
        }
    };

    const removeMemberField = (index: number) => {
        if (category === 'Squad' && members.length > 2) {
            const newMembers = members.filter((_, i) => i !== index);
            setMembers(newMembers);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const user = auth.currentUser;
        if (!user) {
            toast({ title: 'Authentication Error', description: 'You must be logged in.', variant: 'destructive' });
            setLoading(false);
            return;
        }

        const teamData = {
            teamName,
            category,
            members: members.filter(m => m.inGameName && m.inGameUid) // Filter out empty entries
        };
        
        if (!teamName || teamData.members.length === 0) {
            toast({ title: "Incomplete Information", description: "Please provide a team name and at least one valid teammate.", variant: "destructive"});
            setLoading(false);
            return;
        }

        try {
            const idToken = await user.getIdToken();
            const result = await createTeam(teamData, idToken);
            if (result.success) {
                toast({ title: 'Success!', description: 'Team created successfully.' });
                setTeamName('');
                setCategory('Duo');
                setOpen(false);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to create team.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };
    
    const maxMembers = category === 'Duo' ? 1 : 3;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2" /> Add New Team
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a New Team</DialogTitle>
                    <DialogDescription>
                        Assemble your squad to compete in Duo or Squad tournaments.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
                    <div className="space-y-2">
                        <Label htmlFor="team-name">Team Name</Label>
                        <Input id="team-name" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. The Champions" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="team-category">Category</Label>
                        <Select value={category} onValueChange={(value: 'Duo' | 'Squad') => setCategory(value)}>
                            <SelectTrigger id="team-category"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Duo">Duo (1 Teammate)</SelectItem>
                                <SelectItem value="Squad">Squad (2-3 Teammates)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-4">
                        <Label>Team Members ({members.length}/{maxMembers})</Label>
                        {members.map((member, index) => (
                            <div key={index} className="p-3 border rounded-md space-y-3 bg-secondary/50 relative">
                               <p className="text-sm font-semibold text-muted-foreground">Teammate {index + 1}</p>
                               <div className="space-y-2">
                                   <Label htmlFor={`member-name-${index}`}>In-Game Name</Label>
                                   <Input id={`member-name-${index}`} value={member.inGameName} onChange={e => handleMemberChange(index, 'inGameName', e.target.value)} placeholder="ProGamer123" required/>
                               </div>
                               <div className="space-y-2">
                                   <Label htmlFor={`member-uid-${index}`}>In-Game UID</Label>
                                   <Input id={`member-uid-${index}`} value={member.inGameUid} onChange={e => handleMemberChange(index, 'inGameUid', e.target.value)} placeholder="1234567890" required/>
                               </div>
                               {category === 'Squad' && members.length > 2 && (
                                   <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive" onClick={() => removeMemberField(index)}>
                                       <PlusCircle className="rotate-45" />
                                   </Button>
                               )}
                            </div>
                        ))}
                         {category === 'Squad' && members.length < 3 && (
                            <Button type="button" variant="outline" className="w-full" onClick={addMemberField}>
                                <PlusCircle className="mr-2" /> Add Teammate
                            </Button>
                        )}
                    </div>
                    <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-4 px-4 border-t">
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Team"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function ProfilePage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTeams, setLoadingTeams] = useState(true);

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

                const teamsQuery = query(collection(db, 'users', currentUser.uid, 'teams'), orderBy('createdAt', 'desc'));
                const unsubTeams = onSnapshot(teamsQuery, (snapshot) => {
                    const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
                    setTeams(teamsData);
                    setLoadingTeams(false);
                });

                return () => {
                    unsubProfile();
                    unsubTeams();
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

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl">My Teams</CardTitle>
                        <CardDescription>Your saved Duo and Squad teams.</CardDescription>
                    </div>
                    <CreateTeamDialog />
                </CardHeader>
                <CardContent>
                    {loadingTeams ? (
                         <div className="space-y-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : teams.length > 0 ? (
                        <div className="space-y-4">
                            {teams.map(team => (
                                <div key={team.id} className="border p-4 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-lg">{team.teamName}</h3>
                                            <Badge variant="outline">{team.category}</Badge>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Members</h4>
                                        <ul className="space-y-2">
                                            {team.members.map((member, index) => (
                                                <li key={index} className="flex items-center justify-between text-sm p-2 bg-secondary/50 rounded-md">
                                                    <span className="font-medium">{member.inGameName}</span>
                                                    <span className="text-muted-foreground font-mono text-xs">{member.inGameUid}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-secondary/30 rounded-lg">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No Teams Yet</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Click "Add New Team" to get started.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

