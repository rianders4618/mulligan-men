// src/firebase.js
// ─────────────────────────────────────────────────────────────
// STEP 1: Go to https://console.firebase.google.com
// STEP 2: Create a new project called "mulligan-men"
// STEP 3: Click "Web" (</>), register app, copy the config below
// STEP 4: In Firebase console → Build → Realtime Database → Create database
//         Choose "Start in test mode" → your region
// ─────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey:            "AIzaSyDrPVHD9VxsFXerXuuFI9cj4X_cGMb60vc",
  authDomain:        "mulligan-men-golf.firebaseapp.com",
  databaseURL:       "https://mulligan-men-golf-default-rtdb.firebaseio.com",
  projectId:         "mulligan-men-golf",
  storageBucket:     "mulligan-men-golf.firebasestorage.app",
  messagingSenderId: "213745512984",
  appId:             "1:213745512984:web:e086383fea6e5e8b86c96d"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
