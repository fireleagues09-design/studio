
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser, sendEmailVerification } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { User, Mail, Gamepad2, PlusCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { useLoading } from '@/context/LoadingContext';
import { updateGameProfile } from './actions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// --- TYPES ---
type GameProfile = {
    inGameName: string;
    inGameUid: string;
};

type UserProfile = {
    username: string;
    email: string;
    gameProfiles?: {
        'Free Fire'?: GameProfile;
        'BGMI'?: GameProfile;
    };
};

const GAMES = ['Free Fire', 'BGMI'] as const;
type GameKey = typeof GAMES[number];

// --- DIALOG COMPONENT ---
function GameProfileDialog({ user, profile }: { user: FirebaseUser, profile: UserProfile }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedGame, setSelectedGame] = useState<GameKey | ''>('');
    const [inGameName, setInGameName] = useState('');
    const [inGameUid, setInGameUid] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        if (selectedGame && profile.gameProfiles?.[selectedGame]) {
            setInGameName(profile.gameProfiles[selectedGame]!.inGameName);
            setInGameUid(profile.gameProfiles[selectedGame]!.inGameUid);
        } else {
            setInGameName('');
            setInGameUid('');
        }
    }, [selectedGame, profile.gameProfiles, open]);

    const handleGameChange = (value: string) => {
        setSelectedGame(value as GameKey);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGame) {
            toast({ title: "Error", description: "Please select a game.", variant: "destructive" });
            return;
        }
        if (!inGameName || !inGameUid) {
            toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" });
            return;
        }
        setLoading(true);

        try {
            const idToken = await user.getIdToken();
            const result = await updateGameProfile(idToken, selectedGame, inGameName, inGameUid);

            if (result.success) {
                toast({
                    title: 'Success!',
                    description: result.message,
                });
                setOpen(false);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message || 'An unknown error occurred.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Manage Game Profiles
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Game Profiles</DialogTitle>
                    <DialogDescription>
                        Add or update your in-game details for different games.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                     <div className="grid gap-2">
                        <Label htmlFor="game-select">Game</Label>
                        <Select onValueChange={handleGameChange} value={selectedGame}>
                            <SelectTrigger id="game-select">
                                <SelectValue placeholder="Select a game" />
                            </SelectTrigger>
                            <SelectContent>
                                {GAMES.map(game => <SelectItem key={game} value={game}>{game}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedGame && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="in-game-name">In-Game Name</Label>
                                <Input
                                    id="in-game-name"
                                    value={inGameName}
                                    onChange={e => setInGameName(e.target.value)}
                                    placeholder="Your name in the game"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="in-game-uid">In-Game UID</Label>
                                <Input
                                    id="in-game-uid"
                                    value={inGameUid}
                                    onChange={e => setInGameUid(e.target.value)}
                                    placeholder="Your unique ID in the game"
                                    required
                                />
                            </div>
                        </>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading || !selectedGame}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// --- MAIN PAGE COMPONENT ---
export default function ProfilePage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [resending, setResending] = useState(false);

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

    const handleResendVerification = async () => {
        if (!user || resending) return;
        setResending(true);
        try {
            await sendEmailVerification(user);
            toast({
                title: "Verification Link Sent",
                description: "A new verification link has been sent to your email. Please check your inbox and spam folder.",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to send verification link.",
                variant: "destructive",
            });
        } finally {
            setResending(false);
        }
    };

    if (loading || !user) {
        return null;
    }
    
    if (!profile) {
        return null;
    }

    const freeFireProfile = profile.gameProfiles?.['Free Fire'];
    const bgmiProfile = profile.gameProfiles?.['BGMI'];
    const isVerified = user.emailVerified;

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl space-y-8">
            {!isVerified && (
                <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                    <CardHeader>
                        <CardTitle className="text-amber-700 dark:text-amber-400">Verify Your Account</CardTitle>
                        <CardDescription>Your account is not verified. Please check your email for the verification link.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">If you didn't receive the email or the link has expired, you can request a new one. Remember to check your spam folder.</p>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleResendVerification} disabled={resending} variant="default" className="bg-amber-600 hover:bg-amber-700 text-white">
                            {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {resending ? 'Sending...' : 'Resend Verification Link'}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">My Profile</CardTitle>
                    <CardDescription>View and manage your account details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="username" value={profile.username || ''} disabled className="pl-9" />
                        </div>
                        <p className="text-xs text-muted-foreground pt-1">This is your unique FireLeagues username. It cannot be changed.</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="flex items-center gap-3 text-muted-foreground border p-2 rounded-md bg-secondary/50">
                           <Mail className="h-4 w-4" />
                           <p className="flex-grow">{profile.email}</p>
                           {isVerified ? (
                             <Badge className="bg-green-500 border-transparent text-white hover:bg-green-500/90">Verified</Badge>
                           ) : (
                             <Badge variant="destructive">Unverified</Badge>
                           )}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end items-center bg-secondary/50 p-4 rounded-b-lg">
                    <Button variant="ghost" onClick={handleLogout}>Logout</Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gamepad2 />
                        Game Profiles
                    </CardTitle>
                    <CardDescription>
                        Your in-game details used for tournament registrations.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Free Fire</h3>
                        {freeFireProfile ? (
                            <div className="p-4 border rounded-md bg-secondary/50 space-y-2">
                                <p><strong>In-Game Name:</strong> {freeFireProfile.inGameName}</p>
                                <p><strong>In-Game UID:</strong> {freeFireProfile.inGameUid}</p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">No Free Fire profile set.</p>
                        )}
                    </div>
                     <div className="space-y-4">
                        <h3 className="font-semibold text-lg">BGMI</h3>
                        {bgmiProfile ? (
                            <div className="p-4 border rounded-md bg-secondary/50 space-y-2">
                                <p><strong>In-Game Name:</strong> {bgmiProfile.inGameName}</p>
                                <p><strong>In-Game UID:</strong> {bgmiProfile.inGameUid}</p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">No BGMI profile set.</p>
                        )}
                    </div>
                </CardContent>
                 <CardFooter className="border-t p-4 flex justify-end">
                    <GameProfileDialog user={user} profile={profile} />
                </CardFooter>
            </Card>
        </div>
    );
}
