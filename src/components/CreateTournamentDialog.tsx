
'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Tournament as TournamentType } from '@/lib/mock-data';
import { FULL_MAP_RULES } from '@/lib/mock-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, MinusCircle as MinusCircleIcon } from 'lucide-react';
import { createTournamentAction } from '@/app/management/actions';

export function CreateTournamentDialog() {
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
    const [imageUrl, setImageUrl] = useState('');
    
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
        setImageUrl('');
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const user = auth.currentUser;
        if (!user) {
            toast({
                title: "Authentication Error",
                description: "You must be logged in to create a tournament.",
                variant: "destructive"
            });
            setLoading(false);
            return;
        }

        const finalImageUrl = imageUrl.trim() || `https://picsum.photos/seed/${Math.random()}/600/400`;
        const dataAiHint = 'gaming abstract';
        
        // Use the standardized rules for all tournament types as requested
        const rules = FULL_MAP_RULES;

        try {
            const finalPrizeDistribution = prizeDistribution.filter(p => p.place && p.prize);
            if (prizePerKill) {
                finalPrizeDistribution.push({ place: 'Per Kill', prize: prizePerKill });
            }

            const tournamentData = {
                name,
                date,
                time,
                entryFee,
                prize,
                slots: Number(slots),
                category,
                teamType,
                status,
                image: finalImageUrl,
                dataAiHint,
                rules: rules,
                prizeDistribution: finalPrizeDistribution,
                roomId: '',
                roomPassword: '',
            } as Omit<TournamentType, 'id' | 'slotsFilled' | 'registeredPlayers'>;

            const idToken = await user.getIdToken();
            const result = await createTournamentAction(tournamentData, idToken);

            if (result.success) {
                toast({
                    title: 'Success',
                    description: result.message
                });
                resetForm();
                setOpen(false);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error("Error creating tournament:", error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to create tournament. Please try again.',
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
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-6">
                     <div className="grid gap-2">
                        <Label htmlFor="create-name">Tournament Name</Label>
                        <Input id="create-name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="create-image-url">Image URL</Label>
                        <Input id="create-image-url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.png (optional)" />
                        <p className="text-xs text-muted-foreground">If left blank, a default placeholder image will be used.</p>
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

                    <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-6 px-6 border-t">
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
