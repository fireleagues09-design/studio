
'use server';

import { ai } from '@/ai/genkit';
import { RezeInputSchema, RezeOutputSchema, type RezeInput } from '@/ai/schemas/reze';
import { getTournamentsByStatus } from '@/ai/tools/get-tournaments';

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
                    When a user asks about tournaments, use the getTournamentsByStatus tool to check for tournaments with a specific status like 'Upcoming', 'Ongoing', or 'Finished'.
                    Be concise, friendly, and always stay on topic. Start the conversation by introducing yourself and asking how you can help.
                    
                    Here is the conversation history:
                    ${prompt.history.map(h => `${h.role}: ${h.content}`).join('\n')}

                    User's new question: ${prompt.question}
                `,
                history: prompt.history,
                tools: [getTournamentsByStatus]
            });

            return llmResponse.text;
        }
    );

    return await rezeFlow(input);
}
