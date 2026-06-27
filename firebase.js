import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA4BfF-2fY-7QAvySHdW_P1Moer8q4LSRw",
  authDomain: "kilaingtjaiyisu2026.firebaseapp.com",
  projectId: "kilaingtjaiyisu2026",
  storageBucket: "kilaingtjaiyisu2026.firebasestorage.app",
  messagingSenderId: "842546681203",
  appId: "1:842546681203:web:3e9f73c0e553ff6e3da106",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth };
