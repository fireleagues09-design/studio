
"use client";

import { useState, useEffect } from "react";
import TournamentCard from "@/components/TournamentCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { Tournament } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { Button } from "@/components/ui/button";

export default function TournamentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });

    const tournamentsQuery = query(collection(db, "tournaments"), orderBy("status"), orderBy("createdAt", "desc"));
    const unsubscribeTournaments = onSnapshot(tournamentsQuery, (snapshot) => {
        const tournamentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
        setTournaments(tournamentsData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching tournaments:", error);
        setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeTournaments();
    };
  }, []);

  const filteredTournaments = tournaments.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const upcomingTournaments = filteredTournaments.filter(
    (t) => t.status === "Upcoming"
  );
  const ongoingTournaments = filteredTournaments.filter(
    (t) => t.status === "Ongoing"
  );
    const finishedTournaments = filteredTournaments.filter(
    (t) => t.status === "Finished"
  );

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
            </div>
        ))}
    </div>
  );
  
  const renderTournamentList = (tournaments: Tournament[]) => {
      if (tournaments.length === 0) {
        return (
            <div className="text-center py-16 col-span-full">
                <h2 className="text-2xl font-semibold">No Tournaments Found</h2>
                <p className="text-muted-foreground mt-2">There are no tournaments in this category.</p>
            </div>
        )
      }

      return (
        <>
            {tournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} isAuthenticated={!!user} />
            ))}
        </>
      )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div>
            <h1 className="text-4xl font-bold tracking-tight">All Tournaments</h1>
            <p className="text-muted-foreground mt-1">Find your next challenge. Compete and conquer.</p>
        </div>
        <div className="flex w-full md:w-auto md:max-w-sm items-center space-x-2">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search tournaments..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button>
              <Search className="h-4 w-4" />
            </Button>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="finished">Finished</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading || loadingAuth ? renderSkeletons() : renderTournamentList(upcomingTournaments)}
            </div>
        </TabsContent>
        <TabsContent value="ongoing" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {loading || loadingAuth ? renderSkeletons() : renderTournamentList(ongoingTournaments)}
            </div>
        </TabsContent>
        <TabsContent value="finished" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {loading || loadingAuth ? renderSkeletons() : renderTournamentList(finishedTournaments)}
            </div>
        </TabsContent>
      </Tabs>
      {!loading && filteredTournaments.length === 0 && searchTerm && (
        <div className="text-center py-16">
            <h2 className="text-2xl font-semibold">No Tournaments Found</h2>
            <p className="text-muted-foreground mt-2">Your search for "{searchTerm}" did not match any tournaments.</p>
        </div>
      )}
    </div>
  );
}
