
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
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, getDoc, increment } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Tournament } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { isUserRegisteredForTournament } from '@/app/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


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

function TournamentDetailView({ tournamentId }: TournamentDetailViewProps) {
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [isRegistered, setIsRegistered] = useState(false);
    const [registrationLoading, setRegistrationLoading] = useState(false);
    const [showCredentials, setShowCredentials] = useState(false);

    const { toast } = useToast();
    const router = useRouter();
    
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setLoadingAuth(false);
            if (currentUser) {
                // Check if user is registered for the tournament
                const tournamentDocRef = doc(db, 'tournaments', tournamentId);
                const tournamentDoc = await getDoc(tournamentDocRef);
                if (tournamentDoc.exists()) {
                    const tournamentData = tournamentDoc.data() as Tournament;
                    const registeredPlayers = tournamentData.registeredPlayers || [];
                    setIsRegistered(registeredPlayers.includes(currentUser.uid));
                }
            } else {
                setIsRegistered(false);
            }
        });
        return () => unsubscribeAuth();
    }, [tournamentId]);
    
    useEffect(() => {
        if (isRegistered && tournament?.roomId) {
            const fetchRegistrationStatus = async () => {
                if (!user) {
                    setShowCredentials(false);
                    return;
                }
                const idToken = await user.getIdToken();
                const result = await isUserRegisteredForTournament(tournamentId);
                setShowCredentials(result);
            }
            fetchRegistrationStatus();
        } else {
            setShowCredentials(false);
        }
    }, [isRegistered, tournament, user, tournamentId]);


    useEffect(() => {
        const tournamentDocRef = doc(db, 'tournaments', tournamentId);
        const unsubscribe = onSnapshot(tournamentDocRef, (doc) => {
            if (doc.exists()) {
                const data = { id: doc.id, ...doc.data() } as Tournament;
                setTournament(data);
                if (user) {
                    const registeredPlayers = data.registeredPlayers || [];
                    setIsRegistered(registeredPlayers.includes(user.uid));
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


    const handleRegistration = async () => {
        if (!user) {
            toast({
                title: "Not Logged In",
                description: "You must be logged in to register for a tournament.",
                variant: "destructive"
            });
            router.push('/login');
            return;
        }
        
        if (isRegistered) {
             toast({
                title: "Already Registered",
                description: "You are already registered for this tournament.",
            });
            return;
        }

        if (tournament?.status !== 'Upcoming') {
            toast({
                title: "Registration Closed",
                description: "This tournament is not open for registration.",
                variant: "destructive"
            });
            return;
        }

        setRegistrationLoading(true);
        const tournamentDocRef = doc(db, 'tournaments', tournamentId);

        try {
            // Join tournament
            if (tournament && tournament.slotsFilled >= tournament.slots) {
                toast({
                    title: "Registration Failed",
                    description: "This tournament is already full.",
                    variant: "destructive"
                });
                setRegistrationLoading(false);
                return;
            }
            await updateDoc(tournamentDocRef, {
                registeredPlayers: arrayUnion(user.uid),
                slotsFilled: increment(1)
            });
            toast({
                title: "Registration Successful!",
                description: `You have successfully registered for "${tournament?.name}".`
            });
            setIsRegistered(true);
        } catch (error) {
            console.error("Error updating registration:", error);
            toast({
                title: "Registration Error",
                description: "An error occurred. Please try again.",
                variant: "destructive"
            });
        } finally {
            setRegistrationLoading(false);
        }
    };


    if (loading || loadingAuth) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
            <div className="lg:col-span-1 space-y-8">
                <Skeleton className="h-[500px] w-full" />
            </div>
        </div>
      )
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
        status
    } = tournament;

    const progress = (slotsFilled / slots) * 100;
    const isFilled = slotsFilled >= slots;
    const isUpcoming = status === 'Upcoming';

    const getButtonState = () => {
        if (registrationLoading) {
            return { text: 'Processing...', disabled: true, variant: 'default' as const };
        }
        if (isRegistered) {
            return { text: 'Registered', disabled: true, variant: 'secondary' as const };
        }
        if (!isUpcoming) {
             if (status === 'Ongoing') return { text: 'Tournament Started', disabled: true, variant: 'default' as const };
             if (status === 'Finished') return { text: 'Tournament Finished', disabled: true, variant: 'default' as const };
        }
        if (isFilled) {
            return { text: 'Registrations Closed', disabled: true, variant: 'default' as const };
        }
        return { text: 'Register Your Team', disabled: false, variant: 'default' as const };
    };

    const buttonState = getButtonState();

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
                  {category}
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
                <Button 
                    size="lg" 
                    className="w-full font-bold" 
                    disabled={buttonState.disabled}
                    onClick={handleRegistration}
                    variant={buttonState.variant}
                >
                    {buttonState.text}
                </Button>
            </div>
          </Card>

          {showCredentials && <RoomCredentials roomId={roomId!} roomPassword={roomPassword} />}

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
