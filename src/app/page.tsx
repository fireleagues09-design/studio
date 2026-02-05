'use client';

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import TournamentCard from "@/components/TournamentCard";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, limit, onSnapshot, orderBy, where } from 'firebase/firestore';
import type { Tournament } from '@/lib/mock-data';
import { Skeleton } from "@/components/ui/skeleton";
import { HomeSlider } from "@/components/HomeSlider";
import { useLoading } from "@/context/LoadingContext";

export default function Home() {
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const { hideLoader } = useLoading();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });

    const tournamentsQuery = query(
        collection(db, "tournaments"), 
        where("status", "==", "Upcoming"),
        orderBy("createdAt", "desc"), 
        limit(4)
    );

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

  useEffect(() => {
    if (!loadingTournaments && !loadingAuth) {
      hideLoader();
    }
  }, [loadingTournaments, loadingAuth, hideLoader]);

  const viewAllLink = !loadingAuth && user ? "/tournaments" : "/register";

  if (loadingAuth || loadingTournaments) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8 md:gap-12">
      
      <section className="container mx-auto px-4 pt-8 md:pt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4 text-center md:text-left">
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
                    Join the Ultimate Esports Arena
                </h1>
                <p className="text-lg text-muted-foreground">
                    Compete in daily Free Fire tournaments, prove your skills, and win exciting prizes. Your battle for glory starts here.
                </p>
                {!loadingAuth && !user && (
                    <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4">
                        <Button asChild size="lg">
                            <Link href="/register">Register Now <ArrowRight className="ml-2 h-5 w-5" /></Link>
                        </Button>
                        <Button asChild variant="outline" size="lg">
                            <Link href="/login">Login</Link>
                        </Button>
                    </div>
                )}
            </div>
            <div className="w-full">
              <HomeSlider isAuthenticated={!!user} />
            </div>
        </div>
      </section>

      <div className="container mx-auto px-4 flex flex-col gap-8 md:gap-12 pb-8 md:pb-12">
        
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
          {upcomingTournaments.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {upcomingTournaments.map((tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} isAuthenticated={!!user} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 col-span-full bg-secondary rounded-lg">
                    <h2 className="text-2xl font-semibold">No Tournaments Found</h2>
                    <p className="text-muted-foreground mt-2">There are currently no upcoming tournaments. Please check back later!</p>
                </div>
            )
          }
        </section>

      </div>
      
    </div>
  );
}
    