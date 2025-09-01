
"use client";

import { useState, useEffect } from "react";
import TournamentCard from "@/components/TournamentCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { Tournament } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

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

    const tournamentsQuery = query(collection(db, "tournaments"));
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

  const classicTournaments = filteredTournaments.filter(
    (t) => t.category === "Classic Full Map"
  );
  const csTournaments = filteredTournaments.filter(
    (t) => t.category === "Clash Squad 4v4"
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

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div>
            <h1 className="text-4xl font-bold tracking-tight">All Tournaments</h1>
            <p className="text-muted-foreground mt-1">Find your next challenge. Compete and conquer.</p>
        </div>
        <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search tournaments..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="classic">Classic</TabsTrigger>
          <TabsTrigger value="cs">Clash Squad</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
            {loading || loadingAuth ? renderSkeletons() : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredTournaments.map((tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} isAuthenticated={!!user} />
                    ))}
                </div>
            )}
        </TabsContent>
        <TabsContent value="classic" className="mt-6">
           {loading || loadingAuth ? renderSkeletons() : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {classicTournaments.map((tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} isAuthenticated={!!user} />
                    ))}
                </div>
            )}
        </TabsContent>
        <TabsContent value="cs" className="mt-6">
           {loading || loadingAuth ? renderSkeletons() : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {csTournaments.map((tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} isAuthenticated={!!user} />
                    ))}
                </div>
            )}
        </TabsContent>
      </Tabs>
      {!loading && filteredTournaments.length === 0 && (
        <div className="text-center py-16">
            <h2 className="text-2xl font-semibold">No Tournaments Found</h2>
            <p className="text-muted-foreground mt-2">Try adjusting your search or check back later for new events.</p>
        </div>
      )}
    </div>
  );
}
