// This is a server-side file.
'use server';

/**
 * @fileOverview AI-powered tournament recommendation flow.
 *
 * This file defines a Genkit flow that recommends tournaments to a user based on their past signup history.
 *
 * @example
 * ```typescript
 * import { recommendTournaments } from './ai/ai-tournament-recommendation';
 *
 * const userId = 'user123';
 * const recommendations = await recommendTournaments({ userId });
 * console.log(recommendations);
 * ```
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Input schema for the tournament recommendation flow.
 */
const RecommendTournamentsInputSchema = z.object({
  userId: z.string().describe('The ID of the user to recommend tournaments for.'),
});

/**
 * Output schema for the tournament recommendation flow.
 */
const RecommendTournamentsOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      tournamentId: z.string().describe('The ID of the recommended tournament.'),
      tournamentName: z.string().describe('The name of the recommended tournament.'),
      reason: z.string().describe('The reason why this tournament was recommended.'),
    })
  ).describe('A list of recommended tournaments for the user.'),
});

export type RecommendTournamentsInput = z.infer<typeof RecommendTournamentsInputSchema>;
export type RecommendTournamentsOutput = z.infer<typeof RecommendTournamentsOutputSchema>;

/**
 * Recommends tournaments to a user based on their past signup history.
 * @param input The input to the recommendation flow, including the user ID.
 * @returns A list of recommended tournaments.
 */
export async function recommendTournaments(input: RecommendTournamentsInput): Promise<RecommendTournamentsOutput> {
  return recommendTournamentsFlow(input);
}

const getSignupHistory = ai.defineTool(
  {
    name: 'getSignupHistory',
    description: 'Retrieves the past tournament signup history for a given user.',
    inputSchema: z.object({
      userId: z.string().describe('The ID of the user.'),
    }),
    outputSchema: z.array(z.string()).describe('A list of tournament IDs the user has signed up for in the past.'),
  },
  async (input) => {
    // TODO: Replace with actual implementation to fetch signup history from database.
    // For now, return some dummy data.
    console.log('Fetching signup history for user:', input.userId);
    if (input.userId === 'user123') {
      return ['tournament1', 'tournament2'];
    } else if (input.userId === 'user456') {
      return ['tournament3', 'tournament4'];
    } else {
      return [];
    }
  }
);

const getTournamentDetails = ai.defineTool(
  {
    name: 'getTournamentDetails',
    description: 'Retrieves the details for a given tournament ID.',
    inputSchema: z.object({
      tournamentId: z.string().describe('The ID of the tournament.'),
    }),
    outputSchema: z.object({
      tournamentName: z.string().describe('The name of the tournament.'),
      format: z.string().describe('The format of the tournament (e.g., Classic, Clash Squad).'),
      map: z.string().describe('The map the tournament is played on.'),
    }),
  },
  async (input) => {
    // TODO: Replace with actual implementation to fetch tournament details from database.
    // For now, return some dummy data.
    console.log('Fetching tournament details for tournament:', input.tournamentId);
    if (input.tournamentId === 'tournament1') {
      return { tournamentName: 'Classic Tournament 1', format: 'Classic', map: 'Erangel' };
    } else if (input.tournamentId === 'tournament2') {
      return { tournamentName: 'Clash Squad Tournament 1', format: 'Clash Squad', map: 'Kalahari' };
    } else if (input.tournamentId === 'tournament3') {
      return { tournamentName: 'Classic Tournament 2', format: 'Classic', map: 'Miramar' };
    } else if (input.tournamentId === 'tournament4') {
      return { tournamentName: 'Clash Squad Tournament 2', format: 'Clash Squad', map: 'Purgatory' };
    } else {
      return { tournamentName: 'Unknown Tournament', format: 'Unknown', map: 'Unknown' };
    }
  }
);

const recommendTournamentsPrompt = ai.definePrompt({
  name: 'recommendTournamentsPrompt',
  tools: [getSignupHistory, getTournamentDetails],
  input: { schema: RecommendTournamentsInputSchema },
  output: { schema: RecommendTournamentsOutputSchema },
  system: `You are an AI esports tournament recommendation agent.

  You will receive a userId as input. First call the getSignupHistory tool to
  retrieve the user's past signup history.

  Then, based on the user's past signup history, recommend tournaments to the user that
  they are likely to be interested in. Use the getTournamentDetails tool to find
  more information about the tournaments before recommending them.

  Consider the tournament format and map when making recommendations. For example, if
  the user has signed up for many Classic tournaments on Erangel in the past, you should
  recommend similar tournaments.
  `,
  prompt: `Recommend tournaments for user {{{userId}}}.`, // Changed prompt to a simple prompt
});

const recommendTournamentsFlow = ai.defineFlow(
  {
    name: 'recommendTournamentsFlow',
    inputSchema: RecommendTournamentsInputSchema,
    outputSchema: RecommendTournamentsOutputSchema,
  },
  async input => {
    const {output} = await recommendTournamentsPrompt(input);
    return output!;
  }
);
