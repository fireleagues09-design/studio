'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, collection, onSnapshot, getCountFromServer, query, where, updateDoc, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { useLoading } from '@/context/LoadingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Pencil, TrophyIcon, Users, Clock } from 'lucide-react';
import { CreateTournamentDialog } from '@/components/CreateTournamentDialog';
import type { Tournament as TournamentType } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { updateTournamentAction } from '@/app/admin/actions';

function EditTournamentDialog({ tournament }: { tournament: TournamentType }) {
    const timeStr = tournament.time || '';
    const match = timeStr.match(/^(\d{1,2}:\d{2})\s*(AM|PM)?/i);

    const [name, setName] = useState(tournament.name);
    const [date, setDate] = useState(tournament.date);
    const [time, setTime] = useState(match ? match[1] : (timeStr.split(' ')[0] || ''));
    const [period, setPeriod] = useState(match && match[2] ? match[2].toUpperCase() : 'AM');
    const [entryFee, setEntryFee] = useState(tournament.entryFee);
    const [prize, setPrize] = useState(tournament.prize);
    const [slots, setSlots] = useState(tournament.slots.toString());
    const [status, setStatus] = useState<TournamentType['status']>(tournament.status || 'Upcoming');
    const [roomId, setRoomId] = useState(tournament.roomId || '');
    const [roomPassword, setRoomPassword] = useState(tournament.roomPassword || '');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        try {
            const idToken = await user.getIdToken();
            const result = await updateTournamentAction(tournament.id, {
                name,
                date,
                time: `${time} ${period} IST`,
                entryFee,
                prize,
                slots: Number(slots),
                status,
                roomId,
                roomPassword,
            }, idToken);

            if (result.success) {
                toast({
                    title: 'Success',
                    description: result.message
                });
                setOpen(false);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error("Error updating tournament:", error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to update tournament. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Tournament</DialogTitle>
                    <DialogDescription>
                        Make changes to "{tournament.name}".
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-6">
                     <div className="grid gap-2">
                        <Label htmlFor="name">Tournament Name</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="time">Reporting Time</Label>
                            <div className="flex gap-2">
                                <Input 
                                    id="time" 
                                    type="text" 
                                    value={time} 
                                    onChange={e => setTime(e.target.value)} 
                                    className="flex-1"
                                />
                                <Select value={period} onValueChange={setPeriod}>
                                    <SelectTrigger className="w-[80px]">
                                        <SelectValue placeholder="P" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AM">AM</SelectItem>
                                        <SelectItem value="PM">PM</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="entryFee">Entry Fee</Label>
                            <Input id="entryFee" value={entryFee} onChange={e => setEntryFee(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="prize">Prize Pool (INR)</Label>
                            <Input id="prize" value={prize} onChange={e => setPrize(e.target.value)} />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                           <Label htmlFor="slots">Total Slots</Label>
                           <Input id="slots" type="number" value={slots} onChange={e => setSlots(e.target.value)} />
                        </div>
                         <div className="grid gap-2">
                           <Label htmlFor="edit-status">Status</Label>
                           <Select value={status} onValueChange={(value) => setStatus(value as TournamentType['status'])}>
                               <SelectTrigger id="edit-status">
                                   <SelectValue placeholder="Select status" />
                               </SelectTrigger>
                               <SelectContent>
                                   <SelectItem value="Upcoming">Upcoming</SelectItem>
                                   <SelectItem value="Ongoing">Ongoing</SelectItem>
                                   <SelectItem value="Finished">Finished</SelectItem>
                                   <SelectItem value="Cancelled" className="text-destructive font-bold">Cancelled (Refund All)</SelectItem>
                               </SelectContent>
                           </Select>
                        </div>
                    </div>

                    <div className="p-4 border rounded-md space-y-3 bg-secondary/50">
                        <Label>Room Credentials</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="roomId">Room ID</Label>
                                <Input id="roomId" value={roomId} onChange={e => setRoomId(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="roomPassword">Room Password</Label>
                                <Input id="roomPassword" value={roomPassword} onChange={e => setRoomPassword(e.target.value)} />
                            </div>
                        </div>
                    </div>


                    <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-6 px-6 border-t">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default function ManagementPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isEmployee, setIsEmployee] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [totalUsers, setTotalUsers] = useState(0);
    const [tournaments, setTournaments] = useState<TournamentType[]>([]);
    const [upcomingTournaments, setUpcomingTournaments] = useState(0);
    const [ongoingTournaments, setOngoingTournaments] = useState(0);
    const [finishedTournaments, setFinishedTournaments] = useState(0);
    const router = useRouter();
    const { hideLoader } = useLoading();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                const userData = userDoc.data();
                if (userDoc.exists() && (userData?.isEmployee || userData?.isAdmin)) {
                    setIsEmployee(true);
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
        if (!isEmployee) {
            if (!authLoading) setDataLoading(false);
            return;
        };

        const usersRef = collection(db, "users");
        const unsubscribeUsers = onSnapshot(usersRef, async () => {
             const countSnapshot = await getCountFromServer(usersRef);
             setTotalUsers(countSnapshot.data().count);
        }, (error) => {
            console.error("Error fetching user count:", error)
        });

        const tournamentsRef = collection(db, "tournaments");
        const tournamentsQuery = query(tournamentsRef, orderBy("createdAt", "desc"));
        const unsubscribeAllTournaments = onSnapshot(tournamentsQuery, (snapshot) => {
            const tournamentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TournamentType));
            setTournaments(tournamentsData);
        }, (error) => {
            console.error("Error fetching all tournaments:", error);
            toast({ title: "Error", description: "Could not fetch tournament list.", variant: "destructive" });
        });

        const upcomingQuery = query(tournamentsRef, where("status", "==", "Upcoming"));
        const unsubscribeUpcoming = onSnapshot(upcomingQuery, async () => {
            const countSnapshot = await getCountFromServer(upcomingQuery);
            setUpcomingTournaments(countSnapshot.data().count);
        });

        const ongoingQuery = query(tournamentsRef, where("status", "==", "Ongoing"));
        const unsubscribeOngoing = onSnapshot(ongoingQuery, async () => {
            const countSnapshot = await getCountFromServer(ongoingQuery);
            setOngoingTournaments(countSnapshot.data().count);
        });

        const finishedQuery = query(tournamentsRef, where("status", "==", "Finished"));
        const unsubscribeFinished = onSnapshot(finishedQuery, async () => {
            const countSnapshot = await getCountFromServer(finishedQuery);
            setFinishedTournaments(countSnapshot.data().count);
            setDataLoading(false);
        }, (error) => {
            console.error("Error fetching tournament counts:", error);
            setDataLoading(false);
        });


        return () => {
            unsubscribeUsers();
            unsubscribeAllTournaments();
            unsubscribeUpcoming();
            unsubscribeOngoing();
            unsubscribeFinished();
        };
    }, [isEmployee, authLoading, toast]);

    useEffect(() => {
        if (!authLoading && !dataLoading) {
            hideLoader();
        }
    }, [authLoading, dataLoading, hideLoader]);

    if (authLoading || dataLoading) {
        return null;
    }

    if (!isEmployee) {
        return (
            <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
                <div className="flex items-center justify-center h-64">
                    <p>Access Denied. Redirecting...</p>
                </div>
            </div>
        );
    }
    
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
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tournament Overview</CardTitle>
                            <TrophyIcon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold mb-2">{upcomingTournaments + ongoingTournaments + finishedTournaments} Total</div>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Upcoming</span>
                                    <span className="font-semibold">{upcomingTournaments}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Ongoing</span>
                                    <span className="font-semibold">{ongoingTournaments}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Finished</span>
                                    <span className="font-semibold">{finishedTournaments}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

             <section className="space-y-8">
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <TrophyIcon className="h-5 w-5 text-primary" />
                                Tournament Management
                            </CardTitle>
                            <CardDescription>
                                Create new tournaments for the platform.
                            </CardDescription>
                        </div>
                        <CreateTournamentDialog />
                    </CardHeader>
                    <CardContent>
                       <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Slots</TableHead>
                                        <TableHead>Entry Fee</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Prize</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tournaments.map(tournament => (
                                        <TableRow key={tournament.id}>
                                            <TableCell className="font-medium">{tournament.name}</TableCell>
                                            <TableCell>{tournament.date} @ {tournament.time}</TableCell>
                                            <TableCell>{tournament.slotsFilled} / {tournament.slots}</TableCell>
                                            <TableCell>{tournament.entryFee === 'FREE' || tournament.entryFee === '0' ? 'FREE' : `₹${tournament.entryFee}`}</TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    tournament.status === 'Finished' ? 'destructive' :
                                                    tournament.status === 'Cancelled' ? 'outline' :
                                                    tournament.status === 'Ongoing' ? 'default' :
                                                    'secondary'
                                                }>
                                                    {tournament.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">₹{tournament.prize}</TableCell>
                                            <TableCell className="text-center">
                                                <EditTournamentDialog tournament={tournament} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            User Management
                        </CardTitle>
                        <CardDescription>
                            Search for users by their username, email, or UID.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-center items-center h-48 bg-secondary rounded-lg">
                             <Button asChild>
                                <Link href="/management/users">Go to User Search</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
