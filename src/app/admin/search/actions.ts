
'use server';

import { auth, db } from '@/lib/firebase-admin';

export async function searchUsers(
    idToken: string,
    searchTerm: string
): Promise<{ success: boolean; users?: any[]; message?: string }> {
    try {
        // Admin verification removed as per user request.
        // Any authenticated user can now search.
        if (!idToken) {
            return { success: false, message: "Authentication is required to search for users." };
        }
        
        // Verifying the token is still a good practice to ensure the user is logged in.
        try {
            await auth.verifyIdToken(idToken);
        } catch (error) {
             return { success: false, message: "Invalid authentication token." };
        }


        if (!searchTerm) {
             const recentUsersQuery = db.collection('users').orderBy('registeredOn', 'desc').limit(10);
             const recentUsersSnapshot = await recentUsersQuery.get();
             const recentUsers = recentUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
             return { success: true, users: recentUsers };
        }
        
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        // This is not efficient for large datasets, but works for smaller ones.
        // For production, consider a dedicated search service like Algolia or Elasticsearch.
        const usersSnapshot = await db.collection('users').limit(1000).get();
        const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const filteredUsers = allUsers.filter(user => {
            const nameMatch = user.inGameName?.toLowerCase().includes(lowerCaseSearchTerm);
            const uidMatch = user.inGameUid?.toLowerCase().includes(lowerCaseSearchTerm);
            const phoneMatch = user.phone?.toLowerCase().includes(lowerCaseSearchTerm);
            const emailMatch = user.email?.toLowerCase().includes(lowerCaseSearchTerm);
            return nameMatch || uidMatch || phoneMatch || emailMatch;
        });

        return { success: true, users: filteredUsers.slice(0, 50) }; // Limit results

    } catch (error: any) {
        console.error('Error searching users:', error);
        return { success: false, message: error.message || 'An unknown server error occurred.' };
    }
}
