
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase-admin';
import { TournamentSchema } from '../schemas/tournaments';

export const getTournaments = ai.defineTool(
  {
    name: 'getTournaments',
    description: 'Get a list of tournaments based on their status (Upcoming, Ongoing, or Finished).',
    inputSchema: z.object({
      status: z.enum(['Upcoming', 'Ongoing', 'Finished']).describe("The status of the tournaments to fetch."),
    }),
    outputSchema: z.array(TournamentSchema),
  },
  async (input) => {
    try {
      const tournamentsRef = db.collection('tournaments');
      const snapshot = await tournamentsRef.where('status', '==', input.status).get();
      
      if (snapshot.empty) {
        return [];
      }
      
      // Correctly map over the documents in the snapshot
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          status: data.status,
          date: data.date,
          time: data.time,
        };
      });

    } catch (error) {
      console.error("Error fetching tournaments with Admin SDK:", error);
      // It's better to return an empty array and let the AI say there was an issue
      // than to throw an error here, which would crash the flow.
      return [];
    }
  }
);
