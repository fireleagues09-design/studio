'use client';

import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { getRecommendedTournaments } from '@/app/actions';
import TournamentCard from './TournamentCard';
import type { Tournament } from '@/lib/mock-data';
import { Skeleton } from './ui/skeleton';

type RecommendationData = {
  reasoning: string | null;
  recommendations: Tournament[];
};

export default function RecommendedTournaments() {
  const [data, setData] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const result = await getRecommendedTournaments();
        // The mock data doesn't have all fields, so we need to supplement it.
        // In a real app, the AI flow would return complete objects.
        const fullRecommendations = result.recommendations.map(r => ({
            ...r,
            date: "2024-08-30",
            time: "TBD",
            rules: [],
            prizeDistribution: []
        }));
        setData({ reasoning: result.reasoning, recommendations: fullRecommendations });
      } catch (error) {
        console.error("Failed to fetch recommendations:", error);
        setData({ reasoning: null, recommendations: [] });
      } finally {
        setLoading(false);
      }
    }
    fetchRecommendations();
  }, []);

  if (loading) {
    return (
        <section>
            <h2 className="text-3xl font-bold tracking-tight mb-6">Recommended For You</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Skeleton className="h-[450px] rounded-lg" />
                <Skeleton className="h-[450px] rounded-lg" />
            </div>
        </section>
    );
  }

  if (!data || data.recommendations.length === 0) {
    return null; // Don't show the section if there are no recommendations
  }

  return (
    <section>
      <h2 className="text-3xl font-bold tracking-tight mb-4">
        Recommended For You
      </h2>

      {data.reasoning && (
        <div className="mb-6 flex items-start gap-4 rounded-lg border border-primary/20 bg-card p-4">
          <Lightbulb className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-primary">AI Recommendation</h3>
            <p className="text-sm text-muted-foreground">
              {data.reasoning}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.recommendations.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>
    </section>
  );
}
