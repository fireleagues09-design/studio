
'use client';

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import TournamentCard from "@/components/TournamentCard";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, limit, onSnapshot, orderBy } from 'firebase/firestore';
import type { Tournament } from '@/lib/mock-data';
import { Skeleton } from "@/components/ui/skeleton";
import { HomeSlider } from "@/components/HomeSlider";

export default function Home() {
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });

    const tournamentsQuery = query(collection(db, "tournaments"), orderBy("createdAt", "desc"), limit(4));
    const unsubscribeTournaments = onSnapshot(tournamentsQuery, (snapshot) => {
        const tournamentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
        setUpcomingTournaments(tournamentsData);
        setLoadingTournaments(false);
    }, (error) => {
        console.error("Error fetching tournaments:", error);
        setLoadingTournaments(false);
    });
    
    return () => {
        unsubscribeAuth();
        unsubscribeTournaments();
    };
  }, []);


  return (
    <div className="flex flex-col gap-12 md:gap-16 lg:gap-20 pb-12 md:pb-16 lg:pb-20">
      
      <section className="container mx-auto px-4">
        <HomeSlider />
      </section>

      <main className="container mx-auto px-4 flex flex-col gap-12 md:gap-16">
        
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold tracking-tight">
              Upcoming Tournaments
            </h2>
            <Button variant="link" asChild>
              <Link href="/tournaments">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {loadingTournaments ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-4">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {upcomingTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
            </div>
          )}

        </section>

      </main>
    </div>
  );
}
    
