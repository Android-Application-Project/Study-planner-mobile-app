import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC_p--rTEfr6qxjpmZzb2TCO3u_plRKe7w",
  authDomain: "studyplanner-bf053.firebaseapp.com",
  projectId: "studyplanner-bf053",
  storageBucket: "studyplanner-bf053.firebasestorage.app",
  messagingSenderId: "722986819408",
  appId: "1:722986819408:web:e20e22e11ac449319f9655"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;