import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyC_p--rTEfr6qxjpmZzb2TCO3u_plRKe7w",
  authDomain: "studyplanner-bf053.firebaseapp.com",
  projectId: "studyplanner-bf053",
  storageBucket: "studyplanner-bf053.firebasestorage.app",
  messagingSenderId: "722986819408",
  appId: "1:722986819408:web:e20e22e11ac449319f9655"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export default app;