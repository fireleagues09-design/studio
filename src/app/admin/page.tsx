
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, collection, query, orderBy, doc, getDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, writeBatch, limit, getDocs, addDoc } from 'firebase/firestore';
import { auth, db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, DollarSign, Activity, Pencil, Trash, PlusCircle, MinusCircle as MinusCircleIcon, Image as ImageIcon } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Tournament as TournamentType } from '@/lib/mock-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';


type Banner = {
    id: string;
    image: string;
    dataAiHint: string;
    createdAt: any;
};

function CreateTournamentDialog() {
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [entryFee, setEntryFee] = useState('');
    const [prize, setPrize] = useState('');
    const [slots, setSlots] = useState('');
    const [category, setCategory] = useState('Clash Squad 4v4');
    const [teamType, setTeamType] = useState('Squad');
    const [status, setStatus] = useState<TournamentType['status']>('Upcoming');
    const [prizeDistribution, setPrizeDistribution] = useState([{ place: '1st', prize: '' }]);
    const [prizePerKill, setPrizePerKill] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const handlePrizeChange = (index: number, field: 'place' | 'prize', value: string) => {
        const newDistribution = [...prizeDistribution];
        newDistribution[index][field] = value;
        setPrizeDistribution(newDistribution);
    };

    const addPrizeRow = () => {
        setPrizeDistribution([...prizeDistribution, { place: '', prize: '' }]);
    };

    const removePrizeRow = (index: number) => {
        const newDistribution = prizeDistribution.filter((_, i) => i !== index);
        setPrizeDistribution(newDistribution);
    };

    const resetForm = () => {
        setName('');
        setDate('');
        setTime('');
        setEntryFee('');
        setPrize('');
        setSlots('');
        setCategory('Clash Squad 4v4');
        setTeamType('Squad');
        setStatus('Upcoming');
        setPrizeDistribution([{ place: '1st', prize: '' }]);
        setPrizePerKill('');
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const imageUrl = 'https://picsum.photos/600/400';
        const dataAiHint = 'gaming abstract';

        try {
            const finalPrizeDistribution = prizeDistribution.filter(p => p.place && p.prize);
            if (prizePerKill) {
                finalPrizeDistribution.push({ place: 'Per Kill', prize: prizePerKill });
            }

            const tournamentId = Math.random().toString(36).substring(2, 10);
            const tournamentDocRef = doc(db, 'tournaments', tournamentId);

            await setDoc(tournamentDocRef, {
                id: tournamentId,
                name,
                date,
                time,
                entryFee,
                prize,
                slots: Number(slots),
                category,
                teamType,
                status,
                image: imageUrl,
                slotsFilled: 0,
                dataAiHint,
                rules: [],
                prizeDistribution: finalPrizeDistribution,
                createdAt: serverTimestamp()
            });
            toast({
                title: 'Success',
                description: `Tournament "${name}" has been created.`
            });
            resetForm();
            setOpen(false);
        } catch (error) {
            console.error("Error creating tournament:", error);
            toast({
                title: 'Error',
                description: 'Failed to create tournament. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Tournament
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create New Tournament</DialogTitle>
                    <DialogDescription>
                        Fill in the details for the new tournament.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
                     <div className="grid gap-2">
                        <Label htmlFor="create-name">Tournament Name</Label>
                        <Input id="create-name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="create-date">Date</Label>
                            <Input id="create-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-time">Time</Label>
                            <Input id="create-time" type="time" value={time} onChange={e => setTime(e.target.value)} required/>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Prize Details</Label>
                        <div className="p-4 border rounded-md space-y-3 bg-secondary/50">
                             <div className="grid gap-2">
                                <Label htmlFor="create-prize">Total Prize Pool (INR)</Label>
                                <Input id="create-prize" type="number" value={prize} onChange={e => setPrize(e.target.value)} placeholder="e.g. 50000" required/>
                            </div>
                            <Label>Prize Distribution</Label>
                            {prizeDistribution.map((dist, index) => (
                                <div key={index} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-center">
                                    <Input placeholder="Place (e.g., 1st)" value={dist.place} onChange={e => handlePrizeChange(index, 'place', e.target.value)} />
                                    <Input type="number" placeholder="Prize (INR)" value={dist.prize} onChange={e => handlePrizeChange(index, 'prize', e.target.value)} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removePrizeRow(index)} disabled={prizeDistribution.length === 1}>
                                        <MinusCircleIcon className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                             <Button type="button" variant="outline" size="sm" onClick={addPrizeRow}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Rank
                            </Button>
                            <div className="grid gap-2 pt-3 border-t">
                                <Label htmlFor="prize-per-kill">Prize Per Kill (INR)</Label>
                                <Input id="prize-per-kill" type="number" value={prizePerKill} onChange={e => setPrizePerKill(e.target.value)} placeholder="e.g. 50" />
                            </div>
                        </div>
                    </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="create-entryFee">Entry Fee (INR)</Label>
                            <Input id="create-entryFee" value={entryFee} onChange={e => setEntryFee(e.target.value)} required/>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-slots">Total Slots</Label>
                            <Input id="create-slots" type="number" value={slots} onChange={e => setSlots(e.target.value)} required/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="create-category">Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger id="create-category">
                                    <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Clash Squad 4v4">Clash Squad 4v4</SelectItem>
                                    <SelectItem value="Classic Full Map">Classic Full Map</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="create-teamType">Team Type</Label>
                            <Select value={teamType} onValueChange={setTeamType}>
                                <SelectTrigger id="create-teamType">
                                    <SelectValue placeholder="Select team type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Solo">Solo</SelectItem>
                                    <SelectItem value="Duo">Duo</SelectItem>
                                    <SelectItem value="Squad">Squad</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                     <div className="grid gap-2">
                        <Label htmlFor="create-status">Status</Label>
                        <Select value={status} onValueChange={(value) => setStatus(value as TournamentType['status'])}>
                            <SelectTrigger id="create-status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Upcoming">Upcoming</SelectItem>
                                <SelectItem value="Ongoing">Ongoing</SelectItem>
                                <SelectItem value="Finished">Finished</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-4 px-4 border-t">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Tournament'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function EditTournamentDialog({ tournament }: { tournament: TournamentType }) {
    const [name, setName] = useState(tournament.name);
    const [date, setDate] = useState(tournament.date);
    const [time, setTime] = useState(tournament.time);
    const [entryFee, setEntryFee] = useState(tournament.entryFee);
    const [prize, setPrize] = useState(tournament.prize);
    const [slots, setSlots] = useState(tournament.slots.toString());
    const [status, setStatus] = useState<TournamentType['status']>(tournament.status || 'Upcoming');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const tournamentDocRef = doc(db, 'tournaments', tournament.id);
            await updateDoc(tournamentDocRef, {
                name,
                date,
                time,
                entryFee,
                prize,
                slots: Number(slots),
                status,
            });
            toast({
                title: 'Success',
                description: `Tournament "${name}" has been updated.`
            });
            setOpen(false);
        } catch (error) {
            console.error("Error updating tournament:", error);
            toast({
                title: 'Error',
                description: 'Failed to update tournament. Please try again.',
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
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
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
                            <Label htmlFor="time">Time</Label>
                            <Input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} />
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
                               </SelectContent>
                           </Select>
                        </div>
                    </div>

                    <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-4 px-4 border-t">
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

function DeleteTournamentDialog({ tournamentId, tournamentName }: { tournamentId: string, tournamentName: string }) {
    const { toast } = useToast();

    const handleDelete = async () => {
        try {
            await deleteDoc(doc(db, 'tournaments', tournamentId));
            toast({
                title: 'Success',
                description: `Tournament "${tournamentName}" has been deleted.`
            });
        } catch (error) {
            console.error("Error deleting tournament:", error);
            toast({
                title: 'Error',
                description: 'Failed to delete tournament. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <Trash className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the tournament "{tournamentName}".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function UploadSliderButton() {
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);

        try {
            // Check for an existing banner
            const bannersQuery = query(collection(db, 'banners'), orderBy('createdAt', 'asc'), limit(1));
            const snapshot = await getDocs(bannersQuery);
            const bannerDoc = snapshot.docs[0];

            let bannerId: string;
            let oldImageUrl: string | undefined;

            if (bannerDoc) {
                // If a banner exists, prepare to replace it
                bannerId = bannerDoc.id;
                oldImageUrl = bannerDoc.data()?.image;
            } else {
                // If no banner exists, a new ID will be generated by addDoc
                bannerId = `banner-${Date.now()}`;
            }

            // Upload new image
            const storageRef = ref(storage, `banners/${bannerId}-${file.name}`);
            const uploadSnapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(uploadSnapshot.ref);

            // If a banner existed, delete the old image from storage
            if (bannerDoc && oldImageUrl && oldImageUrl.includes('firebasestorage')) {
                try {
                    const oldImageRef = ref(storage, oldImageUrl);
                    await deleteObject(oldImageRef);
                } catch (deleteError: any) {
                    if (deleteError.code !== 'storage/object-not-found') {
                        console.warn("Could not delete old banner image:", deleteError);
                    }
                }
            }
            
            // Create or update Firestore document
            if (bannerDoc) {
                // Update existing document
                 await updateDoc(doc(db, 'banners', bannerId), {
                    image: downloadURL,
                    createdAt: serverTimestamp(), // Update timestamp
                });
                toast({
                    title: 'Success!',
                    description: 'Slider image has been replaced successfully.',
                });
            } else {
                // Create a new document
                await addDoc(collection(db, 'banners'), {
                    image: downloadURL,
                    dataAiHint: 'new slider image', // a default hint
                    createdAt: serverTimestamp(),
                });
                toast({
                    title: 'Success!',
                    description: 'New slider image has been uploaded successfully.',
                });
            }

        } catch (error) {
            console.error("Error uploading image:", error);
            toast({
                title: 'Upload Failed',
                description: 'There was an error updating the slider image.',
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
            if (e.target) {
                e.target.value = '';
            }
        }
    };

    return (
        <Button asChild variant="outline" disabled={uploading}>
            <Label htmlFor="slider-upload" className="cursor-pointer flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Replace First Slider'}
                <Input
                    id="slider-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                />
            </Label>
        </Button>
    );
}

export default function AdminPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [tournaments, setTournaments] = useState<TournamentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
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
                    router.push('/');
                }
            } else {
                router.push('/login');
            }
            setLoading(false);
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!isAdmin) return;

        setDataLoading(true);

        const usersQuery = query(collection(db, "users"), orderBy("registeredOn", "desc"));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            setUsers(usersData);
        }, (error) => console.error("Error fetching users:", error));

        const transactionsQuery = query(collection(db, "transactions"), orderBy("date", "desc"));
        const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
            const transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            setTransactions(transactionsData);
        }, (error) => console.error("Error fetching transactions:", error));
        
        const tournamentsQuery = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
        const unsubscribeTournaments = onSnapshot(tournamentsQuery, (snapshot) => {
            const tournamentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TournamentType));
            setTournaments(tournamentsData);
            setDataLoading(false);
        }, (error) => {
            console.error("Error fetching tournaments:", error)
            setDataLoading(false);
        });

        return () => {
            unsubscribeUsers();
            unsubscribeTransactions();
            unsubscribeTournaments();
        };
    }, [isAdmin]);
    
    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return format(date, 'PPp');
    };

    const totalUsers = users.length;
    const totalDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0);
    const pendingDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'Pending').length;

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
                <div className="flex items-center justify-center h-64">
                    <p>Loading Admin Panel...</p>
                </div>
            </div>
        )
    }

    if (!isAdmin) {
         return (
            <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
                <div className="flex items-center justify-center h-64">
                    <p>Redirecting...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 space-y-12">
            <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
            
            {dataLoading ? (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
            ) : (
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            )}

             <section>
                 <Card>
                    <CardHeader>
                        <CardTitle>Site Management</CardTitle>
                        <CardDescription>Manage sitewide content like homepage sliders.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <UploadSliderButton />
                    </CardContent>
                </Card>
            </section>

            <section>
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Tournament Management</CardTitle>
                            <CardDescription>View, create, edit, and delete all scheduled tournaments.</CardDescription>
                        </div>
                        <CreateTournamentDialog />
                    </CardHeader>
                    <CardContent>
                        {dataLoading ? (
                             <div className="space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : (
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Slots</TableHead>
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
                                                <TableCell>
                                                     <Badge variant={
                                                         tournament.status === 'Finished' ? 'destructive' :
                                                         tournament.status === 'Ongoing' ? 'default' :
                                                         'secondary'
                                                     }>
                                                        {tournament.status}
                                                     </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">₹{tournament.prize}</TableCell>
                                                <TableCell className="text-center flex items-center justify-center gap-1">
                                                    <EditTournamentDialog tournament={tournament} />
                                                    <DeleteTournamentDialog tournamentId={tournament.id} tournamentName={tournament.name} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>

            <section>
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Users</CardTitle>
                        <CardDescription>The last 10 users who registered.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {dataLoading ? (
                             <div className="space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : (
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
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
    

    

    

    

    

    
