import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyC6P0p_wbBQCQ81aJStjIFiL5ygF2r4BiA",
  authDomain: "study-planner-dfdfc.firebaseapp.com",
  projectId: "study-planner-dfdfc",
  storageBucket: "study-planner-dfdfc.firebasestorage.app",
  messagingSenderId: "336827366518",
  appId: "1:336827366518:web:1bc4c699872aa02cd33357"
};


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app;