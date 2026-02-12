'use server';

import { auth, db } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { Tournament } from '@/lib/mock-data';

// This is the single source of truth for employee verification in server actions.
async function verifyEmployee(idToken: string): Promise<{ isEmployee: boolean; message: string; uid?: string }> {
    if (!idToken) {
        return { isEmployee: false, message: "Authentication token was not provided." };
    }
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userDocRef = db.collection('users').doc(decodedToken.uid);
        const userDoc = await userDocRef.get();
        
        if (!userDoc.exists) {
            return { isEmployee: false, message: `Employee verification failed: User document not found for UID ${decodedToken.uid}.` };
        }
        
        const userData = userDoc.data();
        // Check for boolean true or number 1, for flexibility.
        if (userData && (userData.isEmployee === true || userData.isEmployee === 1)) {
            return { isEmployee: true, message: "Success", uid: decodedToken.uid };
        }

        return { isEmployee: false, message: "Permission denied. The calling user is not an employee." };

    } catch (error: any) {
        console.error("Error during employee verification in server action:", error);
        return { isEmployee: false, message: `Server error during employee check: ${error.code || error.message}` };
    }
}


// New combined authorization function for admins or employees
async function verifyManager(idToken: string): Promise<{ authorized: boolean; message: string; uid?: string }> {
    if (!idToken) {
        return { authorized: false, message: "Authentication token was not provided." };
    }
    try {
        const decodedToken = await auth.verifyIdToken(idToken);

        // 1. Check for admin status directly from token claim first for efficiency.
        if (decodedToken.isAdmin === true) {
            return { authorized: true, message: "Success (Admin)", uid: decodedToken.uid };
        }

        // 2. If not an admin by claim, check Firestore for employee or admin status.
        const userDocRef = db.collection('users').doc(decodedToken.uid);
        const userDoc = await userDocRef.get();
        
        if (!userDoc.exists) {
            return { authorized: false, message: `Authorization failed: User document not found for UID ${decodedToken.uid}.` };
        }
        
        const userData = userDoc.data();
        const isEmployee = userData && (userData.isEmployee === true || userData.isEmployee === 1);
        const isAdmin = userData && userData.isAdmin === true;
        
        if (isEmployee || isAdmin) {
            return { authorized: true, message: "Success", uid: decodedToken.uid };
        }

        return { authorized: false, message: "Permission denied. User is not an admin or employee." };

    } catch (error: any) {
        console.error("Error during manager authorization:", error);
        return { authorized: false, message: `Server error during authorization: ${error.code || error.message}` };
    }
}


export async function createTournamentAction(
    tournamentData: Omit<Tournament, 'id' | 'slotsFilled' | 'registeredPlayers'>,
    idToken: string
): Promise<{ success: boolean; message: string }> {
    const managerCheck = await verifyManager(idToken);
    if (!managerCheck.authorized) {
        return { success: false, message: managerCheck.message };
    }

    try {
        const tournamentId = Math.floor(10000000 + Math.random() * 90000000).toString();
        const tournamentDocRef = db.collection('tournaments').doc(tournamentId);

        const dataToSave = {
            ...tournamentData,
            id: tournamentId,
            slotsFilled: 0,
            registeredPlayers: [],
            createdAt: Timestamp.now()
        };

        await tournamentDocRef.set(dataToSave);
        
        return { success: true, message: `Tournament "${tournamentData.name}" has been created.` };

    } catch (error: any) {
        console.error("Error creating tournament via action:", error);
        return { success: false, message: error.message || 'An unknown server error occurred.' };
    }
}
