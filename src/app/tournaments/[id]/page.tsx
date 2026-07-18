'use client';

import { useEffect, useState, use } from 'react';
import Image from "next/image";
import { notFound, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
            <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle>Join {tournament.name}</DialogTitle>
                    <DialogDescription>
                        {tournament.teamType === 'Solo' 
                            ? "Provide your in-game details to secure your slot." 
                            : `Enter details for all ${memberCount} members of your ${tournament.teamType}.`}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 p-6">
                    <form id="team-reg-form" onSubmit={handleSubmit} className="space-y-6">
                        {members.map((member, idx) => (
                            <div key={idx} className="space-y-4 p-4 border rounded-xl bg-secondary/30">
                                <h4 className="font-black text-[10px] text-primary uppercase tracking-widest flex items-center gap-2">
                                    <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px]">{idx + 1}</span>
                                    {idx === 0 ? "Member 1 (Leader / You)" : `Member ${idx + 1} (${tournament.teamType === 'Duo' ? 'Partner' : 'Teammate'})`}
                                </h4>
                                <div className="grid gap-3">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor={`name-${idx}`} className="text-xs">In-Game Name</Label>
                                        <Input 
                                            id={`name-${idx}`} 
                                            value={member.inGameName} 
                                            onChange={e => handleMemberChange(idx, 'inGameName', e.target.value)} 
                                            placeholder={idx === 0 ? "Your FF Name" : "Teammate FF Name"} 
                                            className="h-9"
                                            required 
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor={`uid-${idx}`} className="text-xs">In-Game UID</Label>
                                        <Input 
                                            id={`uid-${idx}`} 
                                            value={member.inGameUid} 
                                            onChange={e => handleMemberChange(idx, 'inGameUid', e.target.value)} 
                                            placeholder={idx === 0 ? "Your FF UID" : "Teammate FF UID"} 
                                            className="h-9"
                                            required 
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </form>
                </ScrollArea>
                <DialogFooter className="p-6 pt-2 border-t bg-secondary/10">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" form="team-reg-form" disabled={loading}>
                        {loading ? 'Processing...' : 'Confirm Entry'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
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
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Rank</TableHead>
                                <TableHead>In-Game Name</TableHead>
                                <TableHead className="text-center">Kills</TableHead>
                                <TableHead className="text-right">Rewards Earned</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rankings.map((player) => (
                                <TableRow key={player.id} className={player.isSuspended ? "opacity-60 bg-muted/50" : ""}>
                                    <TableCell className="font-bold">{player.rank}</TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span className={player.isSuspended ? "line-through text-muted-foreground" : "text-primary"}>
                                                {player.inGameName}
                                            </span>
                                            {player.isSuspended && (
                                                <Badge variant="destructive" className="h-5 px-1 py-0 text-[10px]">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    Disqualified
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-semibold">{player.kills || 0}</TableCell>
                                    <TableCell className="text-right text-green-500 font-bold">
                                        {player.isSuspended ? '-' : (player.prizeWon > 0 ? `₹${player.prizeWon}` : '-')}
                                    </TableCell>
                                </TableRow>
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
          <Card className="overflow-hidden">
            <div className="relative h-64 md:h-96 w-full">
              <Image
                src={image}
                alt={name}
                data-ai-hint={dataAiHint}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <div className="flex gap-2 mb-2">
                  <Badge>{category}</Badge>
                  <Badge variant="outline">{teamType}</Badge>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  {name}
                </h1>
                <p className="text-sm text-primary font-mono mt-1">ID: {id}</p>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Session Intel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground">Rewards Pool:</span>
                </div>
                <strong className="text-lg">₹{prize}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CircleDollarSign className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground">Entry Fee:</span>
                </div>
                <strong>
                  {entryFee === 'FREE' || entryFee === '0' ? `FREE` : `₹${entryFee}`}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground">Lobby Type:</span>
                </div>
                <strong>{teamType}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {category === "Clash Squad 4v4" ? (
                    <Swords className="h-5 w-5 text-primary" />
                  ) : (
                    <Map className="h-5 w-5 text-primary" />
                  )}
                  <span className="text-muted-foreground">Format:</span>
                </div>
                <strong>{category}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground">Date:</span>
                </div>
                <strong>{date}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground">Reporting:</span>
                </div>
                <strong>{time}</strong>
              </div>

              <div className="pt-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>
                    {slotsFilled} / {slots} Slots Secured
                  </span>
                  <span className="font-semibold">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
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
                Fair Play Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {rules?.map((rule, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{rule}</span>
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
