"use client";

import { useState } from "react";
import { tournaments } from "@/lib/mock-data";
import TournamentCard from "@/components/TournamentCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function TournamentsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTournaments = tournaments.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const classicTournaments = filteredTournaments.filter(
    (t) => t.category === "Classic Full Map"
  );
  const csTournaments = filteredTournaments.filter(
    (t) => t.category === "Clash Squad 4v4"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="classic" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {classicTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="cs" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {csTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
      {filteredTournaments.length === 0 && (
        <div className="text-center py-16">
            <h2 className="text-2xl font-semibold">No Tournaments Found</h2>
            <p className="text-muted-foreground mt-2">Try adjusting your search or check back later for new events.</p>
        </div>
      )}
    </div>
  );
}
