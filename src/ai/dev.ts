
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local' });

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.warn("🔥 FIREBASE_SERVICE_ACCOUNT_KEY is not set in .env.local. Genkit features that use Firebase Admin may fail.")
}
