import { MessagePartSchema } from 'genkit';
import { z } from 'zod';

export const RezeInputSchema = z.object({
  history: z.array(MessagePartSchema).optional().describe("The history of the conversation."),
  question: z.string().describe("The user's current question."),
});
export type RezeInput = z.infer<typeof RezeInputSchema>;

export const RezeOutputSchema = z.string();
export type RezeOutput = z.infer<typeof RezeOutputSchema>;
