
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
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Tournament } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { registerSoloPlayer } from '@/app/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLoading } from '@/context/LoadingContext';


type SoloRegistrationDialogProps = {
    tournament: Tournament;
    user: FirebaseUser | null;
    onSuccess: () => void;
}

function SoloRegistrationDialog({ tournament, user, onSuccess }: SoloRegistrationDialogProps) {
    const [inGameName, setInGameName] = useState('');
    const [inGameUid, setInGameUid] = useState('');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
             toast({ title: 'Error', description: 'You must be logged in to register.', variant: 'destructive' });
             router.push('/login');
             return;
        }
        if (!inGameName || !inGameUid) {
            toast({ title: 'Error', description: 'Please fill in all fields.', variant: 'destructive' });
            return;
        }
        setLoading(true);

        try {
            const idToken = await user.getIdToken();
            const result = await registerSoloPlayer(tournament.id, inGameName, inGameUid, idToken);
            if (result.success) {
                toast({
                    title: 'Registration Successful!',
                    description: `You have successfully registered for "${tournament.name}".`
                });
                onSuccess();
                setOpen(false);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
             console.error("Error during solo registration:", error);
             toast({
                title: "Registration Error",
                description: error.message || 'An unknown error occurred during registration.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="w-full font-bold">
                    Register Solo
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Register for {tournament.name}</DialogTitle>
                    <DialogDescription>
                        Please provide your in-game details to complete the registration.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="in-game-name">In-Game Name</Label>
                        <Input 
                            id="in-game-name" 
                            value={inGameName} 
                            onChange={e => setInGameName(e.target.value)} 
                            placeholder="In-game name" 
                            required 
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="in-game-uid">In-Game UID</Label>
                        <Input 
                            id="in-game-uid" 
                            value={inGameUid} 
                            onChange={e => setInGameUid(e.target.value)} 
                            placeholder="In-game UID" 
                            required 
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Registration'}
                        </Button>
                    </DialogFooter>
                </form>
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
            title: 'Copied to Clipboard',
            description: `${fieldName} has been copied.`
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Room Credentials
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

type TournamentDetailViewProps = {
    tournamentId: string;
}

function getButtonState({isRegistered, isFilled, status, teamType}: {isRegistered: boolean, isFilled: boolean, status: string, teamType: string}) {
    if (isRegistered) {
        return { text: 'Registered', disabled: true };
    }
    if (status !== 'Upcoming') {
         if (status === 'Ongoing') return { text: 'Tournament Started', disabled: true };
         if (status === 'Finished') return { text: 'Tournament Finished', disabled: true };
    }
    if (isFilled) {
        return { text: 'Registrations Full', disabled: true };
    }
    // For non-solo tournaments, team registration isn't implemented yet.
    if (teamType !== 'Solo') {
        return { text: `Register ${teamType}`, disabled: true, tooltip: 'Team registration coming soon!'};
    }
    return { text: `Register ${teamType}`, disabled: false };
};

function TournamentDetailView({ tournamentId }: TournamentDetailViewProps) {
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
                console.error("Tournament not found!");
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
        // Manually update slotsFilled to give instant feedback
        if (tournament) {
            setTournament(prev => prev ? ({ ...prev, slotsFilled: prev.slotsFilled + 1 }) : null);
        }
    };

    const renderRegistrationButton = () => {
        if (!user) {
            return (
                <Button size="lg" className="w-full font-bold" onClick={() => router.push('/login')}>
                    Login to Register
                </Button>
            );
        }
        
        if (!user.emailVerified) {
             return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="w-full">
                                <Button size="lg" className="w-full font-bold" disabled>
                                    Register {teamType}
                                </Button>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Please verify your email to register for tournaments.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }
    
        const buttonState = getButtonState({
            isRegistered,
            isFilled: slotsFilled >= slots,
            status,
            teamType,
        });

        if (buttonState.disabled) {
            if (buttonState.tooltip) {
                 return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="w-full">
                                    <Button size="lg" className="w-full font-bold" disabled>
                                        {buttonState.text}
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{buttonState.tooltip}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            }
             return (
                <Button size="lg" className="w-full font-bold" variant="secondary" disabled>
                    {buttonState.text}
                </Button>
            );
        }

        if (teamType === 'Solo') {
            return <SoloRegistrationDialog tournament={tournament} user={user} onSuccess={handleRegistrationSuccess} />;
        }
        
        // Fallback for just-in-case, should be covered by getButtonState
        return null;
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Prize Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Place</TableHead>
                    <TableHead className="text-right">Prize</TableHead>
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
                Registration Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground">Total Prize:</span>
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
                  <span className="text-muted-foreground">Team Type:</span>
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
                  <span className="text-muted-foreground">Time:</span>
                </div>
                <strong>{time}</strong>
              </div>

              <div className="pt-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>
                    {slotsFilled} / {slots} Slots Filled
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
                Please Read All Rules Before Playing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {rules?.map((rule, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{rule}</span>
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
