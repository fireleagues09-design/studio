import { z } from 'zod';

export const RezeInputSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.string(),
    })
  ).describe("The history of the conversation."),
  question: z.string().describe("The user's current question."),
});
export type RezeInput = z.infer<typeof RezeInputSchema>;

export const RezeOutputSchema = z.string();
export type RezeOutput = z.infer<typeof RezeOutputSchema>;
