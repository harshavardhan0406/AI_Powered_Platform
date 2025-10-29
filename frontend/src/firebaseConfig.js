// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);

// Initialize Firestore
const db = getFirestore(app);

export { db };
