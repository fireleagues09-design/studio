'use client';

import { useState, useEffect, use } from 'react';
import { onSnapshot, collection, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import type { Tournament as TournamentType } from '@/lib/mock-data';
import { ArrowLeft, Save, Ban, CheckCircle, Users, Eye, Info } from 'lucide-react';
import Link from 'next/link';
import { useLoading } from '@/context/LoadingContext';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { updateAllPlayerResults, updateUserSuspension } from '../../actions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type Registration = {
    id: string;
    userId: string;
    username?: string;
    inGameName: string;
    inGameUid: string;
    registeredAt: any;
    userPhone?: string; 
    rank?: string;
    prizeWon?: number;
    kills?: number;
    isSuspended?: boolean;
    suspensionNote?: string;
    members?: { inGameName: string, inGameUid: string }[];
};

interface RegistrationPageProps {
  params: Promise<{ id: string }>;
}

function ViewTeamDetailsDialog({ reg }: { reg: Registration }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10">
                    <Users className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Team Roster
                    </DialogTitle>
                    <DialogDescription>
                        Full member details for {reg.inGameName}&apos;s team.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4">
                    {reg.members && reg.members.length > 0 ? reg.members.map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-secondary/50 border border-border/50">
                            <div className="min-w-0">
                                <p className="font-bold text-sm truncate">{m.inGameName}</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-tighter mt-0.5">UID: {m.inGameUid}</p>
                            </div>
                            <Badge variant={i === 0 ? "default" : "secondary"} className="text-[8px] uppercase h-5 font-black">
                                {i === 0 ? "Leader" : `Member ${i + 1}`}
                            </Badge>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
                            <Info className="h-8 w-8 opacity-20" />
                            <p className="text-xs">No teammate records found.</p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="secondary" className="w-full rounded-xl font-bold">Done</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SuspendUserDialog({ 
    userId, 
    username, 
    currentlySuspended, 
    onSuccess 
}: { 
    userId: string, 
    username: string, 
    currentlySuspended: boolean, 
    onSuccess: () => void 
}) {
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const handleAction = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const result = await updateUserSuspension(userId, !currentlySuspended, note, idToken);
            if (result.success) {
                toast({ title: 'Success', description: result.message });
                onSuccess();
                setOpen(false);
                setNote('');
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className={currentlySuspended ? "text-green-500" : "text-destructive"}>
                    {currentlySuspended ? <CheckCircle className="h-4 w-4 mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
                    {currentlySuspended ? "Unsuspend" : "Suspend"}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{currentlySuspended ? "Unsuspend" : "Suspend"} User: {username}</DialogTitle>
                    <DialogDescription>
                        {currentlySuspended 
                            ? "This will allow the user to access the platform again." 
                            : "This will block the user's access to the entire platform immediately."}
                    </DialogDescription>
                </DialogHeader>
                {!currentlySuspended && (
                    <div className="space-y-2 py-2">
                        <Label htmlFor="suspension-note">Reason for Suspension (Note)</Label>
                        <Textarea 
                            id="suspension-note"
                            placeholder="Explain why this user is being suspended..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground italic">This note will be shown to the user when they try to log in.</p>
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button 
                        variant={currentlySuspended ? "default" : "destructive"} 
                        onClick={handleAction} 
                        disabled={loading || (!currentlySuspended && !note.trim())}
                    >
                        {loading ? 'Processing...' : (currentlySuspended ? 'Confirm Unsuspend' : 'Confirm Suspension')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function RegistrationsPage({ params }: RegistrationPageProps) {
    const { id: tournamentId } = use(params);
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [tournament, setTournament] = useState<TournamentType | null>(null);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // State for editable results
    const [results, setResults] = useState<{[key: string]: { rank: string, prize: string, kills: string }}>({});

    const router = useRouter();
    const { hideLoader } = useLoading();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists() && userDoc.data().isAdmin) {
                    setIsAdmin(true);
                } else {
                    router.push('/');
                }
            } else {
                router.push('/login');
            }
            setAuthLoading(false);
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!authLoading && !dataLoading) {
            hideLoader();
        }
    }, [authLoading, dataLoading, hideLoader]);

    useEffect(() => {
        if (authLoading || !isAdmin || !tournamentId) {
             if (!authLoading) {
                setDataLoading(false);
            }
            return;
        };

        setDataLoading(true);

        const tournamentDocRef = doc(db, 'tournaments', tournamentId);
        const unsubscribeTournament = onSnapshot(tournamentDocRef, (doc) => {
             if (doc.exists()) {
                setTournament({ id: doc.id, ...doc.data() } as TournamentType);
            } else {
                console.error("Tournament not found!");
                setTournament(null);
                 setDataLoading(false);
            }
        }, (error) => {
            console.error("Error fetching tournament:", error);
            setDataLoading(false);
        });
        
        const registrationsQuery = query(collection(db, `tournaments/${tournamentId}/registrations`), orderBy("registeredAt", "asc"));
        const unsubscribeRegistrations = onSnapshot(registrationsQuery, async (snapshot) => {
            if (snapshot.empty) {
                setRegistrations([]);
                setDataLoading(false);
                return;
            }
            const registrationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
            
            const registrationsWithUserData = await Promise.all(
                registrationsData.map(async (reg) => {
                    const userDocRef = doc(db, 'users', reg.userId);
                    const userDoc = await getDoc(userDocRef);
                    const initialResults = {
                        rank: reg.rank || '',
                        prize: reg.prizeWon !== undefined ? reg.prizeWon.toString() : '',
                        kills: reg.kills !== undefined ? reg.kills.toString() : ''
                    };
                    
                    setResults(prev => ({ ...prev, [reg.userId]: initialResults }));

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        return { 
                            ...reg, 
                            userPhone: userData.phone || 'N/A',
                            username: userData.username || 'N/A',
                            isSuspended: userData.suspended || false,
                            suspensionNote: userData.suspensionNote || '',
                        };
                    }
                    return { ...reg, userPhone: 'N/A', username: 'N/A' };
                })
            );

            setRegistrations(registrationsWithUserData);
            setDataLoading(false);
        }, (error) => {
            console.error("Error fetching registrations:", error)
            setDataLoading(false);
        });

        return () => {
            unsubscribeTournament();
            unsubscribeRegistrations();
        };
    }, [isAdmin, tournamentId, authLoading]);

    const handleResultChange = (userId: string, field: 'rank' | 'prize' | 'kills', value: string) => {
        setResults(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [field]: value
            }
        }));
    };

    const handleSaveAllResults = async () => {
        if (!user) return;
        
        setSaving(true);
        try {
            const idToken = await user.getIdToken();
            const resultsToSave = Object.entries(results).map(([userId, data]) => ({
                userId,
                rank: data.rank,
                prizeWon: Number(data.prize || 0),
                kills: Number(data.kills || 0)
            }));

            const result = await updateAllPlayerResults(tournamentId, resultsToSave, idToken);
            if (result.success) {
                toast({ title: 'Success', description: 'All player results updated successfully.' });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSaving(true); // Short delay to prevent double clicks
            setTimeout(() => setSaving(false), 500);
        }
    };

    if (authLoading || dataLoading) {
        return null;
    }

    if (!tournament) {
         return (
             <div className="container mx-auto px-4 py-8 md:py-12 text-center">
                <h1 className="text-2xl font-bold">Tournament Not Found</h1>
                 <Button asChild variant="link" className="mt-4">
                    <Link href="/admin">
                        <ArrowLeft className="mr-2 h-4 w-4"/>
                        Back to Admin Dashboard
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
             <Button asChild variant="outline" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Back to Dashboard
                </Link>
            </Button>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">{tournament.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-muted-foreground">Registrations List</p>
                        <Badge variant={tournament.status === 'Finished' ? 'destructive' : 'default'}>{tournament.status}</Badge>
                    </div>
                </div>
                <Button 
                    onClick={handleSaveAllResults} 
                    disabled={saving || registrations.length === 0}
                    className="md:w-auto w-full font-bold"
                >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save All Results'}
                </Button>
            </div>

             <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Registered Players ({registrations.length} / {tournament.slots})</CardTitle>
                        <CardDescription>
                            List of all players who have registered. You can rank players and assign prizes if the tournament is finished.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Competitors</TableHead>
                                        <TableHead>Primary Phone</TableHead>
                                        <TableHead>Rank</TableHead>
                                        <TableHead>Kills</TableHead>
                                        <TableHead>Prize Won (₹)</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {registrations.length > 0 ? registrations.map(reg => (
                                        <TableRow key={reg.id} className={reg.isSuspended ? "bg-destructive/10" : ""}>
                                            <TableCell>
                                                <ViewTeamDetailsDialog reg={reg} />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-primary font-bold">{reg.inGameName}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Leader</span>
                                                        {reg.isSuspended && <Badge variant="destructive" className="h-4 text-[8px] uppercase">Suspended</Badge>}
                                                    </div>
                                                    
                                                    {reg.members && reg.members.length > 1 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                            {reg.members.slice(1).map((m, i) => (
                                                                <Badge key={i} variant="secondary" className="text-[9px] font-medium h-4 bg-primary/5 text-primary border-primary/10">
                                                                    {m.inGameName}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="text-[9px] text-muted-foreground italic mt-0.5 font-mono">UID: {reg.inGameUid}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium tabular-nums">{reg.userPhone}</TableCell>
                                            <TableCell>
                                                <Input 
                                                    className="w-20 h-8"
                                                    placeholder="Rank"
                                                    value={results[reg.userId]?.rank ?? ''}
                                                    onChange={(e) => handleResultChange(reg.userId, 'rank', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input 
                                                    className="w-16 h-8"
                                                    type="number"
                                                    placeholder="Kills"
                                                    value={results[reg.userId]?.kills ?? ''}
                                                    onChange={(e) => handleResultChange(reg.userId, 'kills', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input 
                                                    className="w-24 h-8"
                                                    type="number"
                                                    placeholder="Prize"
                                                    value={results[reg.userId]?.prize ?? ''}
                                                    onChange={(e) => handleResultChange(reg.userId, 'prize', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right flex items-center justify-end gap-1">
                                                <SuspendUserDialog 
                                                    userId={reg.userId} 
                                                    username={reg.username || 'N/A'} 
                                                    currentlySuspended={reg.isSuspended || false}
                                                    onSuccess={() => {}} // Snapshot will update UI
                                                />
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                No entries for this tournament yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
        </div>
    );
}
