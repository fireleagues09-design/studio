
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
import { ArrowLeft, Ban, Search, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useLoading } from '@/context/LoadingContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type SuspendedUser = {
    id: string;
    username: string;
    email: string;
    phone: string;
    photoURL?: string;
    registeredOn: any;
    suspensionNote?: string;
};

export default function SuspendedUsersPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [suspendedUsers, setSuspendedUsers] = useState<SuspendedUser[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
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
        if (!isAdmin) {
            if (!authLoading) {
                setDataLoading(false);
            }
            return;
        };

        setDataLoading(true);
        const suspendedQuery = query(collection(db, `users`), where("suspended", "==", true));
        const unsubscribeSuspended = onSnapshot(suspendedQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SuspendedUser));
            setSuspendedUsers(usersData);
            setDataLoading(false);
        }, (error) => {
            console.error("Error fetching suspended users:", error)
            setDataLoading(false);
        });


        return () => {
            unsubscribeSuspended();
        };
    }, [isAdmin, authLoading]);

    const filteredUsers = suspendedUsers.filter(u => 
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm)
    );

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return format(date, 'MMM dd, yyyy');
    };

    if (authLoading || dataLoading) {
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 space-y-8 max-w-6xl">
             <Button asChild variant="outline" size="sm">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Back to Dashboard
                </Link>
            </Button>
            
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Ban className="text-destructive h-8 w-8" />
                    Suspended Accounts
                </h1>
                <p className="text-muted-foreground">Monitor and manage users who have been restricted from the platform.</p>
            </div>

            <Card className="border-border/50">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Suspension List ({filteredUsers.length})</CardTitle>
                            <CardDescription>View all currently blocked players.</CardDescription>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name, email, phone..." 
                                className="pl-9 h-10 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-xl overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Reason / Note</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                    <TableRow key={u.id} className="hover:bg-muted/30">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 border">
                                                    <AvatarImage src={u.photoURL} />
                                                    <AvatarFallback>{u.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm truncate">{u.username}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium tabular-nums">{u.phone || '—'}</TableCell>
                                        <TableCell className="max-w-xs">
                                            <p className="text-xs italic text-muted-foreground line-clamp-2">
                                                {u.suspensionNote || "No note provided."}
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="outline" className="h-8 rounded-lg" asChild>
                                                <Link href="/admin/users">
                                                    Manage
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                <UserIcon className="h-8 w-8 opacity-20" />
                                                <p className="text-sm">No suspended users found matching your criteria.</p>
                                            </div>
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
