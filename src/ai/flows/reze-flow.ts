
'use server';

import { ai } from '@/ai/genkit';
import { RezeInputSchema, RezeOutputSchema, type RezeInput } from '@/ai/schemas/reze';
import { getTournaments } from '../tools/get-tournaments';

export async function askReze(input: RezeInput): Promise<string> {
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
                    
                    When a user asks about tournaments (e.g., "are there any ongoing tournaments?", "show me upcoming tournaments", "is tournament X finished?"), use the 'getTournaments' tool to get the information from the database.
                    You can search for tournaments by status: 'Upcoming', 'Ongoing', or 'Finished'.
                    
                    The current date is ${new Date().toDateString()}.
                    
                    Be concise, friendly, and always stay on topic. If you are introducing yourself for the first time, be welcoming.
                    
                    Here is the conversation history:
                    ${prompt.history.map(h => `${h.role}: ${h.content}`).join('\n')}

                    User's new question: ${prompt.question}
                `,
                history: prompt.history,
                tools: [getTournaments]
            });

            return llmResponse.text;
        }
    );

    return await rezeFlow(input);
}
