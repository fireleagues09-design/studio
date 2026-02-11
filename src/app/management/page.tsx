
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, collection, onSnapshot, getCountFromServer } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { useLoading } from '@/context/LoadingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users } from 'lucide-react';

export default function ManagementPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isEmployee, setIsEmployee] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [totalUsers, setTotalUsers] = useState(0);
    const router = useRouter();
    const { hideLoader } = useLoading();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists() && userDoc.data().isEmployee) {
                    setIsEmployee(true);
                } else {
                    // If not an employee, redirect to home
                    router.push('/');
                }
            } else {
                // If not logged in, redirect to login
                router.push('/login');
            }
            setAuthLoading(false);
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!isEmployee) {
            if (!authLoading) setDataLoading(false);
            return;
        };

        const usersRef = collection(db, "users");
        const unsubscribeUsers = onSnapshot(usersRef, async () => {
             const countSnapshot = await getCountFromServer(usersRef);
             setTotalUsers(countSnapshot.data().count);
             setDataLoading(false);
        }, (error) => {
            console.error("Error fetching user count:", error)
            setDataLoading(false);
        });

        return () => unsubscribeUsers();
    }, [isEmployee, authLoading]);

    useEffect(() => {
        // This effect will run when auth and data checks are complete.
        if (!authLoading && !dataLoading) {
            hideLoader();
        }
    }, [authLoading, dataLoading, hideLoader]);

    // The FullScreenLoader is active until hideLoader() is called.
    if (authLoading || dataLoading) {
        return null;
    }

    // If the user is not an employee, they will be redirected. Show a message while that happens.
    if (!isEmployee) {
        return (
            <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
                <div className="flex items-center justify-center h-64">
                    <p>Access Denied. Redirecting...</p>
                </div>
            </div>
        );
    }
    
    // Render the actual page content for employees
    return (
        <div className="container mx-auto px-4 py-8 md:py-12 space-y-12">
            <div>
                <h1 className="text-4xl font-bold tracking-tight">Management Dashboard</h1>
                <p className="text-muted-foreground mt-1">Tools and resources for employees.</p>
            </div>
            
            <section>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalUsers}</div>
                            <p className="text-xs text-muted-foreground">Registered users on the platform</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        Welcome
                    </CardTitle>
                    <CardDescription>
                        This is the management area. More features will be added here soon.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center items-center h-48 bg-secondary rounded-lg">
                        <p className="text-muted-foreground">Management content goes here.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
