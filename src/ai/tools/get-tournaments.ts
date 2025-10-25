
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase-admin';
import { OngoingTournamentsSchema } from '@/ai/schemas/tournaments';

export const getOngoingTournaments = ai.defineTool(
  {
    name: 'getOngoingTournaments',
    description: 'Get a list of all tournaments that are currently ongoing.',
    outputSchema: OngoingTournamentsSchema,
  },
  async () => {
    try {
      const tournamentsRef = db.collection('tournaments');
      const snapshot = await tournamentsRef.where('status', '==', 'Ongoing').get();
      
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
      console.error('Error fetching ongoing tournaments:', error);
      // Let the LLM know something went wrong
      return { tournaments: [], error: 'Failed to fetch tournament data.' };
    }
  }
);
