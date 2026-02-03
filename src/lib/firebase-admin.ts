
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local' });

import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// Check for the environment variable first and throw if it's missing.
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error(
    "🔥 FATAL ERROR: The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. This is required for all server-side Firebase functionality. Please add your service account key to your .env.local file and restart the server."
  );
}

let serviceAccount: ServiceAccount;
try {
  // Attempt to parse the service account key from the environment variable.
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

  // FIX: Replace escaped newlines in the private key to ensure correct PEM format.
  if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

} catch (e: any) {
  // If parsing fails, throw a descriptive error.
  throw new Error(
    `🔥 FATAL ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Please ensure it is a valid JSON string. Parse Error: ${e.message}`
  );
}

// Initialize the Firebase Admin SDK if it hasn't been already.
if (!admin.apps.length) {
    try {
        const projectId = serviceAccount.project_id;
        if (!projectId) {
            throw new Error('The service account key is missing the "project_id" field.');
        }
        const storageBucket = `${projectId}.appspot.com`;

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: projectId,
            storageBucket: storageBucket,
        });

        console.log("✅ Firebase Admin SDK initialized successfully.");
    } catch (e: any) {
        throw new Error(`🔥 FATAL ERROR: Failed to initialize Firebase Admin SDK. Error: ${e.message}`);
    }
}

// Export the initialized services.
// This code will only be reached if the initialization is successful.
const auth = admin.auth();
const db = admin.firestore();
const storage = admin.storage();

export { auth, db, storage };
