
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
import { setBestiePageStatus } from '../actions';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

type BestieUser = {
    id: string;
    username: string;
    email: string;
    phone: string;
    registeredOn: any;
};

export default function BestiesPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [bestieUsers, setBestieUsers] = useState<BestieUser[]>([]);
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [isBestiePageEnabled, setIsBestiePageEnabled] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(true);
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
        if (!authLoading && !dataLoading && !settingsLoading) {
            hideLoader();
        }
    }, [authLoading, dataLoading, settingsLoading, hideLoader]);

    useEffect(() => {
        if (!isAdmin) {
            if (!authLoading) {
                setDataLoading(false);
                setSettingsLoading(false);
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

        setSettingsLoading(true);
        const settingsDocRef = doc(db, 'settings', 'featureControls');
        const unsubscribeSettings = onSnapshot(settingsDocRef, (doc) => {
            if (doc.exists()) {
                setIsBestiePageEnabled(doc.data().isBestiePageEnabled || false);
            } else {
                setIsBestiePageEnabled(false);
            }
            setSettingsLoading(false);
        }, (error) => {
            console.error("Error fetching settings:", error);
            setSettingsLoading(false);
        });


        return () => {
            unsubscribeBesties();
            unsubscribeSettings();
        };
    }, [isAdmin, authLoading]);

    const handleBestiePageToggle = async (enabled: boolean) => {
        if (!auth.currentUser) return;
        setActionLoading(prev => ({ ...prev, bestiePageToggle: true }));
        try {
            const idToken = await auth.currentUser.getIdToken();
            const result = await setBestiePageStatus(enabled, idToken);
            if (result.success) {
                toast({ title: 'Success', description: `Bestie page has been ${enabled ? 'activated' : 'deactivated'}.` });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setActionLoading(prev => ({ ...prev, bestiePageToggle: false }));
        }
    };


     const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return format(date, 'PPp');
    };

    if (authLoading || dataLoading || settingsLoading) {
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
            <p className="text-muted-foreground mt-1">A list of all users with the 'isBestie' role.</p>

            <Card>
                <CardHeader>
                    <CardTitle>Feature Control</CardTitle>
                    <CardDescription>
                        Enable or disable the special Bestie page for all eligible users.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="bestie-page-switch" className="text-base font-medium">Special Bestie Page</Label>
                            <p className="text-sm text-muted-foreground">
                                Activate the animated special page for all users with the 'isBestie' role.
                            </p>
                        </div>
                        <Switch
                            id="bestie-page-switch"
                            checked={isBestiePageEnabled}
                            onCheckedChange={handleBestiePageToggle}
                            disabled={actionLoading['bestiePageToggle']}
                        />
                    </div>
                </CardContent>
            </Card>

             <Card>
                    <CardHeader>
                        <CardTitle>Bestie List ({bestieUsers.length})</CardTitle>
                        <CardDescription>
                            Users who have the special bestie role activated.
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
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bestieUsers.length > 0 ? bestieUsers.map(bu => (
                                        <TableRow key={bu.id}>
                                            <TableCell className="font-medium">{bu.username}</TableCell>
                                            <TableCell>{bu.email}</TableCell>
                                            <TableCell>{bu.phone || 'N/A'}</TableCell>
                                            <TableCell>{formatDate(bu.registeredOn)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
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
