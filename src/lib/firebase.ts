// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "fireleagues-drrjw",
  "appId": "1:388454536362:web:886eafbbcb0bd9ceb7acd3",
  "storageBucket": "fireleagues-drrjw.firebasestorage.app",
  "apiKey": "AIzaSyAyQkLAUnzfEnQDZv8fY_sxJ1Epfq_IO4g",
  "authDomain": "fireleagues-drrjw.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "388454536362"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
