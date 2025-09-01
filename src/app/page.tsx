
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

  const viewAllLink = !loadingAuth && user ? "/tournaments" : "/register";

  return (
    <div className="flex flex-col gap-8 pb-12">
      
      <section className="container mx-auto px-4">
        <HomeSlider />
      </section>

      <main className="container mx-auto px-4 flex flex-col gap-8">
        
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold tracking-tight">
              Upcoming Tournaments
            </h2>
            <Button variant="link" asChild>
              <Link href={viewAllLink}>
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {loadingTournaments || loadingAuth ? (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="aspect-square w-full rounded-lg" />
                        <Skeleton className="h-5 w-3/4 rounded-md" />
                    </div>
                ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {upcomingTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} isAuthenticated={!!user} />
                ))}
            </div>
          )}

        </section>

      </main>
    </div>
  );
}
    
