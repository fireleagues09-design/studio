
'use server';

import { auth, db } from '@/lib/firebase-admin';

// Admin verification is removed as per user request.

export async function searchUsers(
    idToken: string,
    searchTerm: string
): Promise<{ success: boolean; users?: any[]; message?: string }> {
    try {
        // Verify the user is authenticated, but no admin check.
        await auth.verifyIdToken(idToken);

        if (!searchTerm.trim()) {
             return { success: true, users: [] };
        }
        
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        // This approach is not highly scalable. For larger user bases,
        // a dedicated search service like Algolia or Elasticsearch is recommended.
        const usersSnapshot = await db.collection('users').get();
        const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const filteredUsers = allUsers.filter(user => {
            const nameMatch = user.inGameName?.toLowerCase().includes(lowerCaseSearchTerm);
            const uidMatch = user.inGameUid?.toLowerCase().includes(lowerCaseSearchTerm);
            const phoneMatch = user.phone?.toLowerCase().includes(lowerCaseSearchTerm);
            const emailMatch = user.email?.toLowerCase().includes(lowerCaseSearchTerm);
            return nameMatch || uidMatch || phoneMatch || emailMatch;
        });

        return { success: true, users: filteredUsers.slice(0, 50) };

    } catch (error: any) {
        console.error('Error searching users:', error);
        // Provide a more generic error if token is invalid, but don't mention admin status
        if (error.code === 'auth/id-token-revoked' || error.code === 'auth/argument-error') {
            return { success: false, message: 'Your session has expired. Please refresh the page and try again.' };
        }
        return { success: false, message: error.message || 'An unknown server error occurred.' };
    }
}
