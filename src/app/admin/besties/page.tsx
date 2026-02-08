
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
import { setBestiePageStatus, setIndividualBestiePageStatus } from '../actions';
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
    bestiePageActive?: boolean;
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

    const handleGlobalBestiePageToggle = async (enabled: boolean) => {
        if (!auth.currentUser) return;
        setActionLoading(prev => ({ ...prev, bestiePageToggle: true }));
        try {
            const idToken = await auth.currentUser.getIdToken();
            const result = await setBestiePageStatus(enabled, idToken);
            if (result.success) {
                toast({ title: 'Success', description: `Global bestie page has been ${enabled ? 'activated' : 'deactivated'}.` });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setActionLoading(prev => ({ ...prev, bestiePageToggle: false }));
        }
    };

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
            <p className="text-muted-foreground mt-1">Manage global and individual settings for the 'isBestie' role.</p>

            <Card>
                <CardHeader>
                    <CardTitle>Global Feature Control</CardTitle>
                    <CardDescription>
                        This is a master switch. Enable or disable the special Bestie page for ALL eligible users at once.
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
                            onCheckedChange={handleGlobalBestiePageToggle}
                            disabled={actionLoading['bestiePageToggle']}
                        />
                    </div>
                </CardContent>
            </Card>

             <Card>
                    <CardHeader>
                        <CardTitle>Individual Bestie Controls ({bestieUsers.length})</CardTitle>
                        <CardDescription>
                            Enable or disable the special page for individual besties. The global switch above must be ON for these to take effect.
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
                                                    disabled={!isBestiePageEnabled || actionLoading[bu.id]}
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
