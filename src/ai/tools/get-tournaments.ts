
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase-admin';
import { TournamentSchema } from '../schemas/tournaments';

export const getTournaments = ai.defineTool(
  {
    name: 'getTournaments',
    description: 'Get a list of tournaments. You can search by status (Upcoming, Ongoing, or Finished) or by a specific tournament ID.',
    inputSchema: z.object({
      status: z.enum(['Upcoming', 'Ongoing', 'Finished']).optional().describe("The status of the tournaments to fetch."),
      id: z.string().optional().describe("A specific tournament ID to fetch."),
    }),
    outputSchema: z.array(TournamentSchema),
  },
  async (input) => {
    try {
      // If an ID is provided, fetch that specific tournament
      if (input.id) {
        const docRef = db.collection('tournaments').doc(input.id);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
             return [{
                id: docSnap.id,
                name: data?.name,
                status: data?.status,
                date: data?.date,
                time: data?.time,
            }];
        } else {
            return []; // Not found
        }
      }

      // If status is provided, query by status
      if (input.status) {
        const tournamentsRef = db.collection('tournaments');
        const snapshot = await tournamentsRef.where('status', '==', input.status).get();
        
        if (snapshot.empty) {
          return [];
        }
        
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
      }

      // If no input is provided, return empty as we need some criteria
      return [];

    } catch (error) {
      console.error("Error fetching tournaments with Admin SDK:", error);
      return [];
    }
  }
);
