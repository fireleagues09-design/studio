
'use client';

import { useEffect, useState, use } from 'react';
import Image from "next/image";
import { notFound, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Calendar,
  Clock,
  Map,
  Swords,
  Trophy,
  Users,
  ShieldCheck,
  ClipboardList,
  Lock,
  CircleDollarSign,
  Medal,
  AlertTriangle,
  User,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { doc, onSnapshot, collection, query, orderBy, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Tournament } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { registerTournamentEntry } from '@/app/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLoading } from '@/context/LoadingContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import React from 'react';

type TournamentRegistrationDialogProps = {
    tournament: Tournament;
    user: FirebaseUser | null;
    onSuccess: () => void;
}

function TournamentRegistrationDialog({ tournament, user, onSuccess }: TournamentRegistrationDialogProps) {
    const memberCount = tournament.teamType === 'Solo' ? 1 : (tournament.teamType === 'Duo' ? 2 : 4);
    const [members, setMembers] = useState(Array.from({ length: memberCount }, () => ({ inGameName: '', inGameUid: '' })));
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        if (open) {
            setMembers(Array.from({ length: memberCount }, () => ({ inGameName: '', inGameUid: '' })));
        }
    }, [open, memberCount]);

    const handleMemberChange = (index: number, field: 'inGameName' | 'inGameUid', value: string) => {
        const updated = [...members];
        updated[index] = { ...updated[index], [field]: value };
        setMembers(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
             toast({ title: 'Error', description: 'Authentication required.', variant: 'destructive' });
             router.push('/login');
             return;
        }

        const isValid = members.every(m => m.inGameName.trim() && m.inGameUid.trim());
        if (!isValid) {
            toast({ title: 'Error', description: 'Provide all teammate details.', variant: 'destructive' });
            return;
        }

        setLoading(true);

        try {
            const idToken = await user.getIdToken();
            const result = await registerTournamentEntry(tournament.id, members, idToken);
            if (result.success) {
                toast({
                    title: 'Registration Successful!',
                    description: `You have joined "${tournament.name}".`
                });
                onSuccess();
                setOpen(false);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
             console.error("Error during registration:", error);
             toast({
                title: "Registration Error",
                description: error.message || 'Lobby entry failed.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="w-full font-bold shadow-lg shadow-primary/20">
                    Join {tournament.teamType} Lobby
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[95vh] flex flex-col p-0 overflow-hidden rounded-t-3xl sm:rounded-3xl">
                <DialogHeader className="p-4 sm:p-6 pb-2 shrink-0 bg-background border-b z-20">
                    <DialogTitle className="text-xl sm:text-2xl">Join {tournament.name}</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        {tournament.teamType === 'Solo' 
                            ? "Confirm your details to secure your slot." 
                            : `Enter details for all ${memberCount} members of your ${tournament.teamType}.`}
                    </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="flex-1 px-4 sm:px-6 py-4">
                    <form id="team-reg-form" onSubmit={handleSubmit} className="space-y-4">
                        {members.map((member, idx) => (
                            <div key={idx} className="space-y-3 p-3 sm:p-4 border border-primary/10 rounded-2xl bg-secondary/20 transition-all hover:bg-secondary/30">
                                <h4 className="font-black text-[9px] sm:text-[10px] text-primary uppercase tracking-widest flex items-center gap-2">
                                    <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px]">{idx + 1}</span>
                                    {idx === 0 ? "Member 1 (Leader / You)" : `Member ${idx + 1} (${tournament.teamType === 'Duo' ? 'Partner' : 'Teammate'})`}
                                </h4>
                                <div className="grid grid-cols-1 gap-2.5">
                                    <div className="grid gap-1">
                                        <Label htmlFor={`name-${idx}`} className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase ml-1">In-Game Name</Label>
                                        <Input 
                                            id={`name-${idx}`} 
                                            value={member.inGameName} 
                                            onChange={e => handleMemberChange(idx, 'inGameName', e.target.value)} 
                                            placeholder={idx === 0 ? "Your FF Name" : "Teammate FF Name"} 
                                            className="h-10 sm:h-11 rounded-xl bg-background border-primary/5 focus:border-primary transition-all"
                                            required 
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label htmlFor={`uid-${idx}`} className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase ml-1">In-Game UID</Label>
                                        <Input 
                                            id={`uid-${idx}`} 
                                            value={member.inGameUid} 
                                            onChange={e => handleMemberChange(idx, 'inGameUid', e.target.value)} 
                                            placeholder={idx === 0 ? "Your FF UID" : "Teammate FF UID"} 
                                            className="h-10 sm:h-11 rounded-xl bg-background border-primary/5 focus:border-primary transition-all"
                                            required 
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </form>
                </ScrollArea>
                
                <DialogFooter className="p-4 sm:p-6 pt-2 border-t bg-secondary/10 shrink-0 gap-3">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" className="flex-1 rounded-xl h-12 font-bold">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" form="team-reg-form" disabled={loading} className="flex-[2] rounded-xl h-12 font-bold shadow-lg shadow-primary/20">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Entry'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function Loader2({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
}


type RoomCredentialsProps = {
    roomId: string;
    roomPassword?: string;
}

function RoomCredentials({ roomId, roomPassword }: RoomCredentialsProps) {
    const { toast } = useToast();

    const copyToClipboard = (text: string, fieldName: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast({
            title: 'Copied',
            description: `${fieldName} copied to clipboard.`
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Arena Credentials
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="roomId">Room ID</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="roomId"
                            value={roomId || "Not available"}
                            readOnly
                            className="font-mono"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(roomId || "", "Room ID")}
                            disabled={!roomId}
                        >
                            Copy
                        </Button>
                    </div>
                </div>
                <div>
                    <Label htmlFor="roomPassword">Password</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="roomPassword"
                            value={roomPassword || "Not available"}
                            readOnly
                            className="font-mono"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                copyToClipboard(roomPassword || "", "Room Password")
                            }
                            disabled={!roomPassword}
                        >
                            Copy
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function getButtonState({isRegistered, isFilled, status}: {isRegistered: boolean, isFilled: boolean, status: string}) {
    if (isRegistered) {
        return { text: 'Registered', disabled: true };
    }
    if (status !== 'Upcoming') {
         if (status === 'Ongoing') return { text: 'Session Ongoing', disabled: true };
         if (status === 'Finished') return { text: 'Session Concluded', disabled: true };
         if (status === 'Cancelled') return { text: 'Session Cancelled', disabled: true };
    }
    if (isFilled) {
        return { text: 'Lobby Full', disabled: true };
    }
    return { text: `Join Match`, disabled: false };
};

function Leaderboard({ tournamentId }: { tournamentId: string }) {
    const [rankings, setRankings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const rankingsQuery = query(collection(db, `tournaments/${tournamentId}/registrations`), orderBy("rank", "asc"));
        const unsubscribe = onSnapshot(rankingsQuery, async (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Filter out those without a rank set
            const rankedPlayers = data.filter(p => p.rank).sort((a, b) => {
                return String(a.rank).localeCompare(String(b.rank), undefined, { numeric: true });
            });

            const withStatus = await Promise.all(rankedPlayers.map(async (p) => {
                const userDoc = await getDoc(doc(db, 'users', p.userId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    return { 
                        ...p, 
                        isSuspended: userData.suspended || false 
                    };
                }
                return { ...p, isSuspended: false };
            }));

            setRankings(withStatus);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [tournamentId]);

    if (loading) return <Skeleton className="h-48 w-full rounded-lg" />;
    if (rankings.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Medal className="h-5 w-5 text-yellow-500" />
                    Final Standings
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-16 text-center">Rank</TableHead>
                                <TableHead>Competitor / Team</TableHead>
                                <TableHead className="text-center">Kills</TableHead>
                                <TableHead className="text-right">Rewards</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rankings.map((player) => (
                                <React.Fragment key={player.id}>
                                    <TableRow className={player.isSuspended ? "opacity-60 bg-muted/50" : "bg-primary/5 border-l-4 border-l-primary"}>
                                        <TableCell className="font-black text-center text-lg">{player.rank}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className={player.isSuspended ? "line-through text-muted-foreground font-bold" : "text-primary font-black"}>
                                                        {player.inGameName}
                                                    </span>
                                                    {player.isSuspended && (
                                                        <Badge variant="destructive" className="h-4 px-1 py-0 text-[8px] uppercase font-bold">
                                                            DQ
                                                        </Badge>
                                                    )}
                                                    {!player.isSuspended && player.members && player.members.length > 0 && (
                                                        <Badge variant="secondary" className="h-4 px-1 py-0 text-[8px] uppercase font-black tracking-tighter">Team</Badge>
                                                    )}
                                                </div>
                                                <span className="text-[9px] text-muted-foreground font-mono uppercase">Leader</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold">{player.kills || 0}</TableCell>
                                        <TableCell className="text-right text-green-500 font-black">
                                            {player.isSuspended ? '-' : (player.prizeWon > 0 ? `₹${player.prizeWon}` : '-')}
                                        </TableCell>
                                    </TableRow>
                                    
                                    {/* Partner Rows in Leaderboard */}
                                    {!player.isSuspended && player.members && player.members.length > 0 && player.members.map((member: any, mIdx: number) => (
                                        <TableRow key={`${player.id}-m-${mIdx}`} className="bg-background/40 hover:bg-muted/10 border-l-4 border-l-primary/30">
                                            <TableCell></TableCell>
                                            <TableCell className="py-2">
                                                <div className="flex items-center gap-2 pl-2">
                                                    <span className="text-xs font-bold text-foreground/70">{member.inGameName}</span>
                                                    <span className="text-[8px] text-muted-foreground uppercase font-black opacity-40">Partner</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-xs font-medium text-muted-foreground">
                                                {member.kills || 0}
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-bold text-green-500/60 tabular-nums">
                                                ₹{player.prizeWon || 0}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function TournamentDetailView({ tournamentId }: { tournamentId: string }) {
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [isRegistered, setIsRegistered] = useState(false);
    
    const { toast } = useToast();
    const router = useRouter();
    const { hideLoader } = useLoading();
    
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setLoadingAuth(false);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!loading && !loadingAuth) {
            hideLoader();
        }
    }, [loading, loadingAuth, hideLoader]);

    useEffect(() => {
        const tournamentDocRef = doc(db, 'tournaments', tournamentId);
        const unsubscribe = onSnapshot(tournamentDocRef, (doc) => {
            if (doc.exists()) {
                const data = { id: doc.id, ...doc.data() } as Tournament;
                setTournament(data);
                if (user) {
                    setIsRegistered(data.registeredPlayers?.includes(user.uid) || false);
                } else {
                    setIsRegistered(false);
                }
            } else {
                setTournament(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tournament:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tournamentId, user]);


    if (loading || loadingAuth) {
      return null;
    }

    if (!tournament) {
        notFound();
    }
    
    const {
        id,
        name,
        category,
        teamType,
        image,
        dataAiHint,
        prize,
        slots,
        slotsFilled,
        date,
        time,
        rules,
        prizeDistribution,
        roomId,
        roomPassword,
        status,
        entryFee
    } = tournament;

    const progress = (slotsFilled / slots) * 100;

    const handleRegistrationSuccess = async () => {
        setIsRegistered(true);
        if (tournament) {
            setTournament(prev => prev ? ({ ...prev, slotsFilled: prev.slotsFilled + 1 }) : null);
        }
    };

    const renderRegistrationButton = () => {
        if (!user) {
            return (
                <Button size="lg" className="w-full font-bold" onClick={() => router.push('/login')}>
                    Sign In to Join
                </Button>
            );
        }
        
        const isVerified = user.emailVerified || user.providerData.some(p => p.providerId === 'google.com');

        if (!isVerified) {
             return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="w-full">
                                <Button size="lg" className="w-full font-bold" disabled>
                                    Verify Email to Compete
                                </Button>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Verify your account to join skill-based lobbies.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }
    
        const buttonState = getButtonState({
            isRegistered,
            isFilled: slotsFilled >= slots,
            status,
        });

        if (buttonState.disabled) {
             return (
                <Button size="lg" className="w-full font-bold" variant="secondary" disabled>
                    {buttonState.text}
                </Button>
            );
        }

        // Return the registration dialog for all tournament types (Solo, Duo, Squad)
        return <TournamentRegistrationDialog tournament={tournament} user={user} onSuccess={handleRegistrationSuccess} />;
    };


    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="overflow-hidden border-none shadow-2xl">
            <div className="relative h-64 md:h-[450px] w-full">
              <Image
                src={image}
                alt={name}
                data-ai-hint={dataAiHint}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className="bg-primary text-primary-foreground font-black uppercase tracking-widest">{category}</Badge>
                  <Badge variant="outline" className="bg-black/50 text-white border-white/20 font-black uppercase tracking-widest backdrop-blur-sm">{teamType}</Badge>
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-white leading-none tracking-tighter drop-shadow-2xl">
                  {name}
                </h1>
                <div className="flex items-center gap-3 mt-4 text-white/60 font-mono text-[10px] md:text-xs uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Trophy className="h-3 w-3 text-primary" /> Lobby ID: {id}</span>
                    <span className="h-1 w-1 bg-white/20 rounded-full" />
                    <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Verified Match</span>
                </div>
              </div>
            </div>
          </Card>

          {status === 'Finished' && <Leaderboard tournamentId={id} />}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Reward Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placement</TableHead>
                    <TableHead className="text-right">Reward</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prizeDistribution?.map((p, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{p.place}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        ₹{p.prize}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-8">
          <Card className="border-primary/20 shadow-xl shadow-primary/5">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="flex items-center gap-2 text-lg uppercase font-black tracking-tighter">
                <ClipboardList className="h-5 w-5 text-primary" />
                Lobby Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between gap-3 p-3 bg-secondary/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg"><Trophy className="h-4 w-4 text-primary" /></div>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pool</span>
                </div>
                <strong className="text-xl font-black">₹{prize}</strong>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-secondary/30 rounded-xl space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Entry Fee</p>
                    <p className="font-bold text-primary">{entryFee === 'FREE' || entryFee === '0' ? `FREE` : `₹${entryFee}`}</p>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-xl space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Type</p>
                    <p className="font-bold">{teamType}</p>
                  </div>
              </div>

              <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /> <span>Date</span></div>
                    <span className="font-bold">{date}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> <span>Reporting</span></div>
                    <span className="font-bold">{time}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground"><Swords className="h-4 w-4" /> <span>Mode</span></div>
                    <span className="font-bold">{category}</span>
                  </div>
              </div>

              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <span>
                    {slotsFilled} / {slots} Secured
                  </span>
                  <span className={cn("font-black", progress > 80 ? "text-destructive" : "text-primary")}>{Math.round(progress)}% Full</span>
                </div>
                <Progress value={progress} className="h-2.5 rounded-full" />
              </div>
            </CardContent>
            <div className="p-6 pt-0">
                {renderRegistrationButton()}
            </div>
          </Card>
          
          {isRegistered && roomId && <RoomCredentials roomId={roomId} roomPassword={roomPassword} />}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Lobby Protocol
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {rules?.map((rule, index) => (
                  <li key={index} className="flex items-start gap-3 group">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <ShieldCheck className="h-3 w-3" />
                    </div>
                    <span className="text-sm font-medium leading-relaxed opacity-80 group-hover:opacity-100">{rule}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
}

interface TournamentPageProps {
  params: Promise<{ id: string }>;
}

export default function TournamentPage({ params }: TournamentPageProps) {
  const { id } = use(params);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <TournamentDetailView key={id} tournamentId={id} />
    </div>
  );
}
