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
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useLoading } from '@/context/LoadingContext';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { updatePlayerResult } from '../../actions';

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
};

interface RegistrationPageProps {
  params: Promise<{ id: string }>;
}

export default function RegistrationsPage({ params }: RegistrationPageProps) {
    const { id: tournamentId } = use(params);
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [tournament, setTournament] = useState<TournamentType | null>(null);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});
    
    // State for editable results
    const [results, setResults] = useState<{[key: string]: { rank: string, prize: string }}>({});

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
                        prize: reg.prizeWon !== undefined ? reg.prizeWon.toString() : '0'
                    };
                    
                    setResults(prev => ({ ...prev, [reg.userId]: initialResults }));

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        return { 
                            ...reg, 
                            userPhone: userData.phone || 'N/A',
                            username: userData.username || 'N/A'
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

    const handleResultChange = (userId: string, field: 'rank' | 'prize', value: string) => {
        setResults(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [field]: value
            }
        }));
    };

    const handleSaveResult = async (userId: string) => {
        if (!user) return;
        const { rank, prize } = results[userId];
        
        setActionLoading(prev => ({ ...prev, [userId]: true }));
        try {
            const idToken = await user.getIdToken();
            const result = await updatePlayerResult(tournamentId, userId, rank, Number(prize || 0), idToken);
            if (result.success) {
                toast({ title: 'Success', description: 'Player result updated.' });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setActionLoading(prev => ({ ...prev, [userId]: false }));
        }
    };

     const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return format(date, 'PPp');
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
                                        <TableHead>Username</TableHead>
                                        <TableHead>In-Game Name</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Rank</TableHead>
                                        <TableHead>Prize Won (₹)</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {registrations.length > 0 ? registrations.map(reg => (
                                        <TableRow key={reg.id}>
                                            <TableCell className="font-medium text-primary">{reg.username}</TableCell>
                                            <TableCell>{reg.inGameName}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{reg.userPhone}</TableCell>
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
                                                    className="w-24 h-8"
                                                    type="number"
                                                    placeholder="Prize"
                                                    value={results[reg.userId]?.prize ?? ''}
                                                    onChange={(e) => handleResultChange(reg.userId, 'prize', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => handleSaveResult(reg.userId)}
                                                    disabled={actionLoading[reg.userId]}
                                                >
                                                    <Save className="h-4 w-4 mr-1" />
                                                    Save
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                No players have registered for this tournament yet.
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
