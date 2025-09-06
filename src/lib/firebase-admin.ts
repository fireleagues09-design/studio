
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// Ensure the service account key is provided
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error(
    "🔥 FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing. " +
    "Please set it with your Firebase service account JSON string."
  );
}

let serviceAccount: ServiceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} catch (err: any) {
  throw new Error(
    "🔥 FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. " +
    "Please check your environment variable. Error: " + err.message
  );
}


if (!admin.apps.length) {
  try {
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
    console.log("✅ Firebase Admin initialized successfully");
  } catch (err: any) {
      console.error("🔥 Failed to initialize Firebase Admin:", err);
      throw err;
  }
}

export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();
