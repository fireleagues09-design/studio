'use client';

import { useState, useEffect } from 'react';
import { MOCK_BANNERS, tournaments } from '@/lib/mock-data';
import type { User } from '@/lib/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';

export default function AdminPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [banners, setBanners] = useState(MOCK_BANNERS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers(usersData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredUsers = users.filter(user => 
        user.inGameName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        user.phone.includes(searchTerm)
    );
    
    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return format(date, 'PPP');
    };

    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <h1 className="text-4xl font-bold tracking-tight mb-8">Admin Panel</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-3 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>Search, view, and manage registered users.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by name or phone..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>In-Game Name</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Wallet Balance</TableHead>
                                            <TableHead>Registered</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center">Loading users...</TableCell>
                                            </TableRow>
                                        ) : filteredUsers.map(user => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium">{user.inGameName}</TableCell>
                                                <TableCell>{user.phone}</TableCell>
                                                <TableCell>₹{user.walletBalance.toFixed(2)}</TableCell>
                                                <TableCell>{formatDate(user.registeredOn)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                             {filteredUsers.length === 0 && !loading && (
                                <p className="text-center text-muted-foreground py-8">No users found.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Banners</CardTitle>
                            <CardDescription>Update the promotional banners on the home page.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {banners.map((banner, index) => (
                                <div key={index} className="flex items-center gap-4 p-2 border rounded-md">
                                    <img src={banner.image} alt={banner.title} className="w-24 h-12 object-cover rounded-md"/>
                                    <div className="flex-grow">
                                        <p className="font-semibold">{banner.title}</p>
                                        <p className="text-sm text-muted-foreground">{banner.description}</p>
                                    </div>
                                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Edit Tournament</CardTitle>
                            <CardDescription>Select a tournament to modify its details.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="tournament-select">Tournament</Label>
                                <Select>
                                    <SelectTrigger id="tournament-select">
                                        <SelectValue placeholder="Select a tournament to edit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tournaments.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="prize">Prize Pool</Label>
                                    <Input id="prize" placeholder="e.g., 50,000"/>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="slots">Total Slots</Label>
                                    <Input id="slots" type="number" placeholder="e.g., 100"/>
                                </div>
                            </div>
                            <Button className="w-full md:w-auto">Update Tournament</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
