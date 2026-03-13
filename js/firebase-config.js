// ============================================
// DADRIS DESIGNERS — FIREBASE CONFIGURATION
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCYcrazrmkXJXaRMBUzTZFBOwS2BUxs3QQ",
  authDomain: "dadris-designers.firebaseapp.com",
  projectId: "dadris-designers",
  storageBucket: "dadris-designers.firebasestorage.app",
  messagingSenderId: "813719033161",
  appId: "1:813719033161:web:ee55f44da47a7748793698",
  measurementId: "G-TZPFR27B3H"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
