
'use client';

import { useState, useEffect, use } from 'react';
import { onSnapshot, collection, query, orderBy, doc, getDoc, updateDoc, collectionGroup } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import type { Tournament as TournamentType } from '@/lib/mock-data';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLoading } from '@/context/LoadingContext';

type Registration = {
    id: string;
    userId: string;
    inGameName: string;
    inGameUid: string;
    registeredAt: any;
    userPhone?: string; 
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
    const router = useRouter();
    const { hideLoader } = useLoading();

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

        // Fetch tournament details
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
        
        // Fetch registrations
        const registrationsQuery = query(collection(db, `tournaments/${tournamentId}/registrations`), orderBy("registeredAt", "asc"));
        const unsubscribeRegistrations = onSnapshot(registrationsQuery, async (snapshot) => {
            if (snapshot.empty) {
                setRegistrations([]);
                setDataLoading(false);
                return;
            }
            const registrationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
            
            // Fetch phone numbers for each registered user
            const registrationsWithPhones = await Promise.all(
                registrationsData.map(async (reg) => {
                    const userDocRef = doc(db, 'users', reg.userId);
                    const userDoc = await getDoc(userDocRef);
                    const userPhone = userDoc.exists() ? userDoc.data().phone : 'N/A';
                    return { ...reg, userPhone };
                })
            );

            setRegistrations(registrationsWithPhones);
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
            <h1 className="text-4xl font-bold tracking-tight">{tournament.name}</h1>
            <p className="text-muted-foreground mt-1">Registrations List</p>

             <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Registered Players ({registrations.length} / {tournament.slots})</CardTitle>
                        <CardDescription>
                            List of all players who have registered for this solo tournament.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>In-Game Name</TableHead>
                                        <TableHead>In-Game UID</TableHead>
                                        <TableHead>Phone Number</TableHead>
                                        <TableHead>Registered On</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {registrations.length > 0 ? registrations.map(reg => (
                                        <TableRow key={reg.id}>
                                            <TableCell className="font-medium">{reg.inGameName}</TableCell>
                                            <TableCell>{reg.inGameUid}</TableCell>
                                            <TableCell>{reg.userPhone}</TableCell>
                                            <TableCell>{formatDate(reg.registeredAt)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
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
