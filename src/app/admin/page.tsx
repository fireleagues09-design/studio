
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Users, DollarSign, Activity } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';

type UserProfile = {
    id: string;
    inGameName: string;
    phone: string;
    email: string;
    registeredOn: any;
    wallet: {
        deposit: number;
        winning: number;
        bonus: number;
    };
    isAdmin?: boolean;
};

type Transaction = {
    id: string;
    type: 'deposit' | 'entry_fee' | 'withdrawal' | 'prize';
    amount: number;
    date: any;
    status: 'Completed' | 'Pending' | 'Failed';
};

export default function AdminPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists() && userDoc.data().isAdmin) {
                    setIsAdmin(true);
                } else {
                    // Non-admin user, redirect away.
                    router.push('/');
                }
            } else {
                // No user, redirect to login.
                router.push('/login');
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        // This effect runs only when `isAdmin` becomes true.
        if (isAdmin) {
            const usersQuery = query(collection(db, "users"), orderBy("registeredOn", "desc"));
            const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
                const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
                setUsers(usersData);
                setLoading(false); // Stop loading once user data is fetched
            }, (error) => {
                console.error("Error fetching users:", error);
                setLoading(false);
            });

            const transactionsQuery = query(collection(db, "transactions"), orderBy("date", "desc"));
            const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
                const transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
                setTransactions(transactionsData);
            }, (error) => {
                console.error("Error fetching transactions:", error);
            });

            return () => {
                unsubscribeUsers();
                unsubscribeTransactions();
            };
        }
    }, [isAdmin]);
    
    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return format(date, 'PPp');
    };

    const totalUsers = users.length;
    const totalDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0);
    const pendingDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'Pending').length;

    // The loading state now correctly reflects the entire verification and data fetching process.
    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
                <Skeleton className="h-10 w-64" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <Skeleton className="h-96" />
            </div>
        )
    }

    // This check is now more robust.
    if (!isAdmin) {
        return null; // or a 'not authorized' message while redirecting
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <h1 className="text-4xl font-bold tracking-tight mb-8">Admin Dashboard</h1>
            
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers}</div>
                        <p className="text-xs text-muted-foreground">All registered users</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalDeposits.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Completed deposits</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingDeposits}</div>
                        <p className="text-xs text-muted-foreground">Pending deposit requests</p>
                    </CardContent>
                </Card>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Users</CardTitle>
                    <CardDescription>The last 10 users who registered.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>In-Game Name</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Registered</TableHead>
                                    <TableHead className="text-right">Admin</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.slice(0, 10).map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.inGameName}</TableCell>
                                        <TableCell>{user.phone}</TableCell>
                                        <TableCell>{formatDate(user.registeredOn)}</TableCell>
                                        <TableCell className="text-right">
                                            {user.isAdmin && <Badge>Admin</Badge>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
