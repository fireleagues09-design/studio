'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, collection, query, where, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLoading } from '@/context/LoadingContext';
import { setIndividualBestiePageStatus } from '../actions';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

type BestieUser = {
    id: string;
    username: string;
    email: string;
    phone: string;
    registeredOn: any;
    bestiePageActive?: boolean;
};

export default function BestiesPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [bestieUsers, setBestieUsers] = useState<BestieUser[]>([]);
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
    
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
        if (!isAdmin) {
            if (!authLoading) {
                setDataLoading(false);
            }
            return;
        };

        setDataLoading(true);
        const bestiesQuery = query(collection(db, `users`), where("isBestie", "==", true));
        const unsubscribeBesties = onSnapshot(bestiesQuery, (snapshot) => {
            const bestiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BestieUser));
            setBestieUsers(bestiesData);
            setDataLoading(false);
        }, (error) => {
            console.error("Error fetching bestie users:", error)
            setDataLoading(false);
        });


        return () => {
            unsubscribeBesties();
        };
    }, [isAdmin, authLoading]);

    const handleIndividualBestiePageToggle = async (userId: string, enabled: boolean) => {
        if (!auth.currentUser) return;
        setActionLoading(prev => ({ ...prev, [userId]: true }));
        try {
            const idToken = await auth.currentUser.getIdToken();
            const result = await setIndividualBestiePageStatus(userId, enabled, idToken);
            if (result.success) {
                toast({ title: 'Success', description: `Page status updated for this user.` });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
            // Revert UI on failure
            setBestieUsers(prev => prev.map(u => u.id === userId ? { ...u, bestiePageActive: !enabled } : u));
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

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
             <Button asChild variant="outline" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Back to Dashboard
                </Link>
            </Button>
            <h1 className="text-4xl font-bold tracking-tight">Bestie Users</h1>
            <p className="text-muted-foreground mt-1">Manage settings for the 'isBestie' role.</p>

             <Card>
                    <CardHeader>
                        <CardTitle>Individual Bestie Controls ({bestieUsers.length})</CardTitle>
                        <CardDescription>
                            Enable or disable the special animated page for individual besties.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone Number</TableHead>
                                        <TableHead>Registered On</TableHead>
                                        <TableHead className="text-right">Page Active</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bestieUsers.length > 0 ? bestieUsers.map(bu => (
                                        <TableRow key={bu.id}>
                                            <TableCell className="font-medium">{bu.username}</TableCell>
                                            <TableCell>{bu.email}</TableCell>
                                            <TableCell>{bu.phone || 'N/A'}</TableCell>
                                            <TableCell>{formatDate(bu.registeredOn)}</TableCell>
                                            <TableCell className="text-right">
                                                 <Switch
                                                    checked={bu.bestiePageActive === true}
                                                    onCheckedChange={(checked) => handleIndividualBestiePageToggle(bu.id, checked)}
                                                    disabled={actionLoading[bu.id]}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No users have the 'isBestie' role yet.
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
