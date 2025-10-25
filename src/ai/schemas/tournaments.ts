
import { z } from 'zod';

export const TournamentSchema = z.object({
  id: z.string().describe("The unique identifier for the tournament."),
  name: z.string().describe("The name of the tournament."),
  status: z.enum(['Upcoming', 'Ongoing', 'Finished']).describe("The current status of the tournament."),
  date: z.string().describe("The date of the tournament."),
  time: z.string().describe("The time of the tournament."),
});

export type Tournament = z.infer<typeof TournamentSchema>;
