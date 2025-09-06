
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. This is required for server-side authentication.');
    }

    const serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount;
    const projectId = serviceAccount.project_id;
    if (!projectId) {
        throw new Error('The provided service account key is missing the "project_id" field.');
    }
    
    const storageBucket = `${projectId}.appspot.com`;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId,
      storageBucket: storageBucket,
    });

    console.log('Firebase Admin SDK initialized successfully.');

  } catch (error: any) {
    // Log a more detailed error message to help with debugging.
    let errorMessage = 'Firebase Admin SDK initialization error: ';
    if (error instanceof SyntaxError) {
      errorMessage += 'Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is a valid JSON string.';
    } else {
      errorMessage += error.message;
    }
    console.error(errorMessage);
    // Re-throw the error to indicate a critical failure in initialization.
    throw new Error(errorMessage);
  }
}

export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();
