import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDnQys4Z82-NyW9Pms9oQKKulRV2U0Ys1s",
  authDomain: "sakanect-chat.firebaseapp.com",
  projectId: "sakanect-chat",
  storageBucket: "sakanect-chat.firebasestorage.app",
  messagingSenderId: "344990681720",
  appId: "1:344990681720:web:619e69a12998a5addcbb8d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);