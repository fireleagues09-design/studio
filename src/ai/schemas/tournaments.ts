
import { z } from 'zod';

export const OngoingTournamentsSchema = z.object({
  tournaments: z.array(z.object({
    name: z.string().describe("The name of the tournament."),
    id: z.string().describe("The ID of the tournament."),
  })).describe("A list of ongoing tournaments."),
  error: z.string().optional().describe("A message to return if fetching tournaments failed."),
});

export type OngoingTournaments = z.infer<typeof OngoingTournamentsSchema>;
