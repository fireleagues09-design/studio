'use server';

import { recommendTournaments } from '@/ai/flows/recommendation';

export async function getRecommendedTournaments() {
  // In a real app, you would get the logged-in user's ID from session/auth
  const userId = 'user-123';
  try {
    const data = await recommendTournaments(userId);
    return data;
  } catch (error) {
    console.error('Error fetching AI recommendations:', error);
    // Return a default empty state in case of an error
    return { reasoning: null, recommendations: [] };
  }
}
