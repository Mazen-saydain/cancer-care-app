// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBIOjTFCVXXV-BcJxw4p96xltLYNWNAT3I",
  authDomain: "breast-cancer-care-app.firebaseapp.com",
  projectId: "breast-cancer-care-app",
  storageBucket: "breast-cancer-care-app.firebasestorage.app",
  messagingSenderId: "46455758280",
  appId: "1:46455758280:web:4088a6cb9805e68a5f74fd",
  measurementId: "G-ZSFMCXY3JN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);