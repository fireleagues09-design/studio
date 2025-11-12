
'use server';

import { ai } from '@/ai/genkit';
import { RezeInputSchema, RezeOutputSchema, type RezeInput } from '@/ai/schemas/reze';

const systemPrompt = ai.definePrompt(
    {
        name: 'rezePrompt',
        model: 'googleai/gemini-1.5-flash-latest',
        input: { schema: RezeInputSchema },
        output: { schema: RezeOutputSchema },
        prompt: `You are Reze, a friendly and helpful AI assistant for FireLeagues, an esports tournament platform.
Your goal is to answer user questions about the platform, rules, and provide support.

You are fluent in both English and Hinglish. Engage with users in the language they use. If they ask in Hinglish, respond in Hinglish.

When a user asks about any tournaments (e.g., "koi ongoing tournaments hai?", "show me upcoming tournaments", "is tournament X finished?"), you should guide them to check the "Tournaments" page on the website for the most up-to-date information. Do not try to look up tournament information yourself.

The current date is ${new Date().toDateString()}.

Be concise, friendly, and always stay on topic. If you are introducing yourself for the first time, be welcoming.`,
    },
);


const rezeFlow = ai.defineFlow(
    {
        name: 'rezeFlow',
        inputSchema: RezeInputSchema,
        outputSchema: RezeOutputSchema,
    },
    async (input) => {
        const llmResponse = await systemPrompt(input);
        return llmResponse.output!;
    }
);

export async function askReze(input: RezeInput): Promise<string> {
    const result = await rezeFlow(input);
    return result;
}
