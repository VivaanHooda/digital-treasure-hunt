// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4qKSZKVc1kuEHVZBuhiaxpM94HA_9Aog",
  authDomain: "siptreasurehunt.firebaseapp.com",
  projectId: "siptreasurehunt",
  storageBucket: "siptreasurehunt.firebasestorage.app",
  messagingSenderId: "986165750222",
  appId: "1:986165750222:web:daa5fb78d98851728a239f",
  measurementId: "G-Y3787NBDY9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;
