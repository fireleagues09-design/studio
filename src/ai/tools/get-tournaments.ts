
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase-admin';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { OngoingTournamentsSchema } from '@/ai/schemas/tournaments';

export const getTournamentsByStatus = ai.defineTool(
  {
    name: 'getTournamentsByStatus',
    description: 'Get a list of all tournaments with a given status (e.g., Upcoming, Ongoing, Finished).',
    inputSchema: z.object({
        status: z.enum(['Upcoming', 'Ongoing', 'Finished']).describe("The status of the tournaments to fetch.")
    }),
    outputSchema: OngoingTournamentsSchema,
  },
  async ({ status }) => {
    try {
      const tournamentsRef = db.collection('tournaments');
      const q = tournamentsRef.where('status', '==', status).limit(10);
      const snapshot = await q.get();
      
      if (snapshot.empty) {
        return {
          tournaments: [],
        };
      }

      const tournaments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            name: data.name,
            id: doc.id
        }
      });
      
      return { tournaments };
    } catch (error) {
      console.error(`Error fetching ${status} tournaments:`, error);
      // Let the LLM know something went wrong
      return { tournaments: [], error: 'Failed to fetch tournament data.' };
    }
  }
);
