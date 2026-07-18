
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
import { ArrowLeft, Save, Ban, CheckCircle, Users, Eye, Info, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useLoading } from '@/context/LoadingContext';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { updateSingleRegistrationResults, updateUserSuspension } from '../../actions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
    members?: { inGameName: string, inGameUid: string, kills?: number }[];
};

interface RegistrationPageProps {
  params: Promise<{ id: string }>;
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
                <Button variant="ghost" size="sm" className={currentlySuspended ? "text-green-500 h-8" : "text-destructive h-8"}>
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
    const [savingId, setSavingId] = useState<string | null>(null);
    
    // Results state handles everything for a specific registration
    const [results, setResults] = useState<{[regId: string]: { 
        rank: string;
        prize: string;
        leaderKills: string;
        memberKills: string[];
    }}>({});

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
                        leaderKills: reg.kills !== undefined ? reg.kills.toString() : '',
                        memberKills: reg.members?.map(m => (m.kills !== undefined ? m.kills.toString() : '')) || []
                    };
                    
                    setResults(prev => ({ ...prev, [reg.id]: initialResults }));

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

    const handleResultChange = (regId: string, field: 'rank' | 'prize' | 'leaderKills', value: string) => {
        setResults(prev => ({
            ...prev,
            [regId]: {
                ...prev[regId],
                [field]: value
            }
        }));
    };

    const handleMemberKillChange = (regId: string, memberIdx: number, value: string) => {
        setResults(prev => {
            const currentMemberKills = [...(prev[regId]?.memberKills || [])];
            currentMemberKills[memberIdx] = value;
            return {
                ...prev,
                [regId]: {
                    ...prev[regId],
                    memberKills: currentMemberKills
                }
            }
        });
    }

    const handleSaveRowResults = async (reg: Registration) => {
        if (!user) return;
        
        const rowResults = results[reg.id];
        if (!rowResults) return;

        setSavingId(reg.id);
        try {
            const idToken = await user.getIdToken();
            
            const membersWithKills = (reg.members || []).map((m, idx) => ({
                ...m,
                kills: Number(rowResults.memberKills[idx] || 0)
            }));

            const result = await updateSingleRegistrationResults(
                tournamentId, 
                reg.id, 
                {
                    rank: rowResults.rank,
                    prizeWon: Number(rowResults.prize || 0),
                    kills: Number(rowResults.leaderKills || 0),
                    membersWithKills
                },
                idToken
            );

            if (result.success) {
                toast({ title: 'Saved!', description: `Results updated for ${reg.inGameName}` });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSavingId(null);
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
            
            <header className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight">{tournament.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-muted-foreground text-sm">Registrations & Result Manager</p>
                    <Badge variant={tournament.status === 'Finished' ? 'destructive' : 'default'} className="h-5 text-[10px]">{tournament.status}</Badge>
                </div>
            </header>

             <Card>
                    <CardHeader className="bg-muted/5 border-b">
                        <CardTitle className="text-xl">Lobby Entries ({registrations.length} / {tournament.slots})</CardTitle>
                        <CardDescription>
                            Individual kill tracking is enabled for all teammates. The "Prize Won" is applied to the entire entry.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead>Competitor Details</TableHead>
                                        <TableHead className="w-24 text-center">Rank</TableHead>
                                        <TableHead className="w-24 text-center">Kills</TableHead>
                                        <TableHead className="w-32 text-right">Prize Won (₹)</TableHead>
                                        <TableHead className="w-24 text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {registrations.length > 0 ? registrations.map(reg => (
                                        <React.Fragment key={reg.id}>
                                            <TableRow className={cn(reg.isSuspended ? "bg-destructive/5" : "bg-primary/5")}>
                                                <TableCell className="text-center">
                                                    <div className="p-2 bg-primary/10 rounded-full w-fit mx-auto">
                                                        <UserRound className="h-4 w-4 text-primary" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-primary text-base">{reg.inGameName}</span>
                                                            <Badge variant="outline" className="text-[8px] font-black uppercase h-4 border-primary/20 text-primary">Leader</Badge>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">UID: {reg.inGameUid}</p>
                                                            <p className="text-[10px] text-muted-foreground font-bold">Tel: {reg.userPhone}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        className="w-16 h-10 mx-auto text-center font-bold border-primary/20"
                                                        placeholder="#"
                                                        value={results[reg.id]?.rank ?? ''}
                                                        onChange={(e) => handleResultChange(reg.id, 'rank', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        className="w-16 h-10 mx-auto text-center font-bold border-primary/20"
                                                        type="number"
                                                        placeholder="0"
                                                        value={results[reg.id]?.leaderKills ?? ''}
                                                        onChange={(e) => handleResultChange(reg.id, 'leaderKills', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        className="w-28 h-10 ml-auto text-right font-bold text-green-600 border-primary/20"
                                                        type="number"
                                                        placeholder="0"
                                                        value={results[reg.id]?.prize ?? ''}
                                                        onChange={(e) => handleResultChange(reg.id, 'prize', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button 
                                                            size="icon" 
                                                            className="h-9 w-9 rounded-full" 
                                                            onClick={() => handleSaveRowResults(reg)}
                                                            disabled={savingId === reg.id}
                                                        >
                                                            {savingId === reg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                        </Button>
                                                        <SuspendUserDialog 
                                                            userId={reg.userId} 
                                                            username={reg.username || 'N/A'} 
                                                            currentlySuspended={reg.isSuspended || false}
                                                            onSuccess={() => {}} 
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {/* Teammate Rows */}
                                            {reg.members && reg.members.length > 0 && reg.members.map((member, mIdx) => (
                                                <TableRow key={`${reg.id}-m-${mIdx}`} className="bg-background/50 hover:bg-muted/20 border-l-4 border-l-primary/30">
                                                    <TableCell className="text-center opacity-40">
                                                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mx-auto" />
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm text-foreground/80">{member.inGameName}</span>
                                                                <Badge variant="secondary" className="text-[7px] font-black uppercase h-3.5 tracking-tighter opacity-60">Partner {mIdx + 1}</Badge>
                                                            </div>
                                                            <p className="text-[9px] text-muted-foreground font-mono uppercase">UID: {member.inGameUid}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="text-[10px] font-black text-muted-foreground uppercase opacity-40">Shared</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            className="w-14 h-8 mx-auto text-center text-xs font-bold bg-secondary/50 border-transparent focus:border-primary/20"
                                                            type="number"
                                                            placeholder="0"
                                                            value={results[reg.id]?.memberKills[mIdx] ?? ''}
                                                            onChange={(e) => handleMemberKillChange(reg.id, mIdx, e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="text-[10px] font-black text-muted-foreground uppercase opacity-40">Synced</div>
                                                    </TableCell>
                                                    <TableCell></TableCell>
                                                </TableRow>
                                            ))}
                                        </React.Fragment>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">
                                                <Info className="h-8 w-8 mx-auto opacity-10 mb-2" />
                                                No competitors registered for this lobby yet.
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

function Loader2({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
}
