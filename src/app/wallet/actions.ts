
'use server';

import { auth, db } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export async function requestWithdrawal(
    amount: number,
    method: 'upi' | 'bank',
    details: any,
    idToken: string
): Promise<{ success: boolean; message: string }> {

    if (!idToken) {
        return { success: false, message: 'Authorization required.' };
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        const userRef = db.collection('users').doc(userId);
        const transactionRef = db.collection('transactions').doc();

        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) {
                throw new Error("User not found.");
            }
            
            const wallet = userDoc.data()?.wallet || { winning: 0 };
            if (wallet.winning < amount) {
                throw new Error("Insufficient winnings balance for this withdrawal.");
            }

            // Decrement winnings balance immediately
            t.update(userRef, { 'wallet.winning': FieldValue.increment(-amount) });

            // Create pending withdrawal transaction
            t.set(transactionRef, {
                userId,
                amount,
                type: 'withdrawal',
                status: 'Pending',
                date: Timestamp.now(),
                details: {
                    method,
                    ...details,
                }
            });
        });

        return { success: true, message: 'Withdrawal request submitted successfully.' };

    } catch (error: any) {
        console.error('Error requesting withdrawal:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}
