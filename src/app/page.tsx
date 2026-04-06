'use client';

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Shield, Zap } from "lucide-react";
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

  if (loadingAuth || loadingTournaments) {
    return (
      <div className="container mx-auto px-4 py-12 space-y-8">
        <Skeleton className="h-[400px] w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 md:gap-16">
      
      {/* Hero Section & SEO Content */}
      <section className="container mx-auto px-4 pt-8 md:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-center lg:text-left">
                {/* Static SEO Content - Visible to Google */}
                <h1 className="text-3xl lg:text-5xl font-black tracking-tight leading-tight">
                    FireLeagues - Skill-Based <span className="text-primary">Competitive Gaming</span> Arena
                </h1>
                {!user && (
                  <>
                    <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                        FireLeagues is the ultimate platform where players can join daily skill-based Free Fire tournaments, 
                        compete with top-tier opponents, and earn performance-based rewards. Prove your dominance in our professional arena.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                        <Button asChild size="lg" className="h-14 px-8 text-lg font-bold rounded-full">
                            <Link href="/register">Start Competing <ArrowRight className="ml-2 h-5 w-5" /></Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg font-bold rounded-full border-2">
                            <Link href="/login">Login</Link>
                        </Button>
                    </div>
                  </>
                )}
            </div>
            <div className="w-full relative">
              <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full" />
              <HomeSlider isAuthenticated={!!user} />
            </div>
        </div>
      </section>

      {/* Feature Section for SEO Keywords */}
      <section className="bg-secondary/30 py-12 md:py-20 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 space-y-3">
              <div className="p-4 bg-primary/10 rounded-2xl text-primary"><Trophy className="h-8 w-8" /></div>
              <h3 className="text-xl font-bold">Elite Rewards</h3>
              <p className="text-sm text-muted-foreground">Compete for significant rewards in our daily skill-based matches and grand leagues.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 space-y-3">
              <div className="p-4 bg-primary/10 rounded-2xl text-primary"><Shield className="h-8 w-8" /></div>
              <h3 className="text-xl font-bold">Verified Fair Play</h3>
              <p className="text-sm text-muted-foreground">Our advanced anti-cheat systems and manual review process ensure a 100% hacker-free competitive environment.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 space-y-3">
              <div className="p-4 bg-primary/10 rounded-2xl text-primary"><Zap className="h-8 w-8" /></div>
              <h3 className="text-xl font-bold">Expert Support</h3>
              <p className="text-sm text-muted-foreground">Receive assistance within minutes through our dedicated 24/7 support ticket system and live agent chat.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 flex flex-col gap-8 md:gap-12 pb-16">
        <section>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Active Lobbies</h2>
              <p className="text-muted-foreground">Secure your entry before registration slots are filled.</p>
            </div>
            <Button variant="ghost" asChild className="font-bold">
              <Link href="/tournaments">
                View All Matches <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {upcomingTournaments.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {upcomingTournaments.map((tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} isAuthenticated={!!user} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed">
                    <h2 className="text-2xl font-bold opacity-50">Lobbies are being prepared...</h2>
                    <p className="text-muted-foreground mt-2">New tournaments are added regularly. Check back shortly!</p>
                </div>
            )
          }
        </section>
      </div>
      
    </div>
  );
}
