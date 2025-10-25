
'use server';

import { ai } from '@/ai/genkit';
import { RezeInputSchema, RezeOutputSchema, type RezeInput } from '@/ai/schemas/reze';
import type { Tournament } from '@/lib/mock-data';

export async function askReze(input: RezeInput, tournaments: Tournament[]): Promise<string> {
    const rezeFlow = ai.defineFlow(
        {
            name: 'rezeFlow',
            inputSchema: RezeInputSchema,
            outputSchema: RezeOutputSchema,
        },
        async (prompt) => {
            const llmResponse = await ai.generate({
                prompt: `
                    You are Reze, a friendly and helpful AI assistant for FireLeagues, an esports tournament platform.
                    Your goal is to answer user questions about the platform, tournaments, rules, and provide support.
                    
                    When a user asks about tournaments (e.g., "are there any ongoing tournaments?"), use the provided tournament list to answer.
                    The current date is ${new Date().toDateString()}.
                    The tournament list is structured as: { id, name, status, date, time }.
                    - 'Upcoming' tournaments have not started yet.
                    - 'Ongoing' tournaments are currently active.
                    - 'Finished' tournaments are completed.

                    Be concise, friendly, and always stay on topic. Start the conversation by introducing yourself and asking how you can help.
                    
                    Here is the tournament list:
                    ${JSON.stringify(tournaments.map(t => ({ id: t.id, name: t.name, status: t.status, date: t.date, time: t.time })))}

                    Here is the conversation history:
                    ${prompt.history.map(h => `${h.role}: ${h.content}`).join('\n')}

                    User's new question: ${prompt.question}
                `,
                history: prompt.history,
            });

            return llmResponse.text;
        }
    );

    return await rezeFlow(input);
}
