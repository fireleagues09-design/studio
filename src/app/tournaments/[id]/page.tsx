

'use client';

import { useEffect, useState } from 'react';
import Image from "next/image";
import { notFound } from "next/navigation";
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
  User as UserIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Tournament } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';

type TournamentPageProps = {
  params: {
    id: string;
  };
};

type TournamentDetailViewProps = {
    tournamentId: string;
}

function TournamentDetailView({ tournamentId }: TournamentDetailViewProps) {
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const tournamentDocRef = doc(db, 'tournaments', tournamentId);
        const unsubscribe = onSnapshot(tournamentDocRef, (doc) => {
            if (doc.exists()) {
                setTournament({ id: doc.id, ...doc.data() } as Tournament);
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
    }, [tournamentId]);

    if (loading) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
            <div className="lg:col-span-1">
                <Skeleton className="h-[500px] w-full" />
            </div>
        </div>
      )
    }

    if (!tournament) {
        notFound();
    }
    
    const {
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
    } = tournament;

    const progress = (slotsFilled / slots) * 100;
    const isFilled = slotsFilled >= slots;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
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
              </div>
            </div>
          </Card>

          <Tabs defaultValue="rules" className="mt-8">
            <TabsList>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="prizes">Prize Pool</TabsTrigger>
            </TabsList>
            <TabsContent value="rules" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tournament Rules</CardTitle>
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
            </TabsContent>
            <TabsContent value="prizes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Prize Distribution</CardTitle>
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
                          <TableCell className="font-medium">
                            {p.place}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            ₹{p.prize}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Registration Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Total Prize:</span>
                <strong className="ml-auto text-lg">₹{prize}</strong>
              </div>
               <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Team Type:</span>
                <strong className="ml-auto">{teamType}</strong>
              </div>
              <div className="flex items-center gap-3">
                {category === "Clash Squad 4v4" ? <Swords className="h-5 w-5 text-primary" /> : <Map className="h-5 w-5 text-primary" />}
                <span className="text-muted-foreground">Format:</span>
                <strong className="ml-auto">{category}</strong>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Date:</span>
                <strong className="ml-auto">{date}</strong>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Time:</span>
                <strong className="ml-auto">{time}</strong>
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
              <Button size="lg" className="w-full font-bold" disabled={isFilled}>
                {isFilled ? "Registrations Closed" : "Register Your Team"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
}

export default function TournamentPage({ params }: TournamentPageProps) {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <TournamentDetailView key={params.id} tournamentId={params.id} />
    </div>
  );
}
