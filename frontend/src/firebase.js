// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// This is the part that was causing the error
const firebaseConfig = {
  apiKey: "AIzaSyB9X4_q3wvBzl6NvqSfz1xByUah3Yb-2Is",
  authDomain: "ai-powered-platform.firebaseapp.com",
  projectId: "ai-powered-platform",
  storageBucket: "ai-powered-platform.firebasestorage.app",
  messagingSenderId: "360410393307",
  appId: "1:360410393307:web:3520d15992362da7e6bafe",
  measurementId: "G-D1W13PCX0K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
// This allows your App.js to import and use them
export const auth = getAuth(app);
export const db = getFirestore(app);