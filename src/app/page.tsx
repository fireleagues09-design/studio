
'use client';

import Image from "next/image";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import TournamentCard from "@/components/TournamentCard";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, limit, onSnapshot, orderBy } from 'firebase/firestore';
import type { Tournament } from '@/lib/mock-data';
import { Skeleton } from "@/components/ui/skeleton";

type Banner = {
  id: string;
  title: string;
  description: string;
  image: string;
  dataAiHint: string;
};

export default function Home() {
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });

    const tournamentsQuery = query(collection(db, "tournaments"), limit(4));
    const unsubscribeTournaments = onSnapshot(tournamentsQuery, (snapshot) => {
        const tournamentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
        setUpcomingTournaments(tournamentsData);
        setLoadingTournaments(false);
    }, (error) => {
        console.error("Error fetching tournaments:", error);
        setLoadingTournaments(false);
    });

    const bannersQuery = query(collection(db, "banners"), orderBy("createdAt", "desc"));
    const unsubscribeBanners = onSnapshot(bannersQuery, (snapshot) => {
        const bannersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
        setBanners(bannersData);
        setLoadingBanners(false);
    }, (error) => {
        console.error("Error fetching banners:", error);
        setLoadingBanners(false);
    });

    return () => {
        unsubscribeAuth();
        unsubscribeTournaments();
        unsubscribeBanners();
    };
  }, []);


  return (
    <div className="flex flex-col gap-12 md:gap-16 lg:gap-20 pb-12 md:pb-16 lg:pb-20">
      <section className="relative h-[60vh] md:h-[70vh] w-full text-white">
        <Image
          src="https://picsum.photos/1920/1080"
          alt="Hero background"
          data-ai-hint="esports arena"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-300">
            Welcome to FireLeagues
          </h1>
          <p className="mt-4 max-w-2xl text-lg md:text-xl text-neutral-200">
            The ultimate battleground for Free Fire champions. Join daily
            tournaments, prove your skill, and win exciting prizes.
          </p>
          <div className="mt-8 flex gap-4">
            <Button asChild size="lg" className="font-semibold" disabled={loadingAuth}>
              <Link href={!loadingAuth && !user ? "/register" : "/tournaments"}>Browse Tournaments</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4">
        {loadingBanners ? (
            <Skeleton className="w-full aspect-video md:aspect-[2.4/1]" />
        ) : (
            <Carousel
            opts={{
                align: "start",
                loop: true,
            }}
            className="w-full"
            >
            <CarouselContent>
                {banners.map((banner, index) => (
                <CarouselItem key={index}>
                    <Card className="overflow-hidden">
                    <div className="relative aspect-video md:aspect-[2.4/1]">
                        <Image
                        src={banner.image}
                        alt={banner.title}
                        data-ai-hint={banner.dataAiHint}
                        fill
                        className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-6 md:p-8">
                        <h2 className="text-2xl md:text-4xl font-bold text-white">{banner.title}</h2>
                        <p className="text-md md:text-lg text-neutral-200 mt-2">{banner.description}</p>
                        </div>
                    </div>
                    </Card>
                </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
            </Carousel>
        )}
      </div>
      
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
