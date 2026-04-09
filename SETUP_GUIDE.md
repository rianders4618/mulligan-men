# 🏌️ Mulligan Men App — Setup Guide
## From Zero to Live in About 20 Minutes

---

## What You'll End Up With
A live URL (e.g. `https://mulligan-men.vercel.app`) that all 21 players open on
their phones. Every score entered by anyone syncs instantly to everyone else's screen.

---

## STEP 1 — Install Node.js (one-time, 2 min)

1. Go to **https://nodejs.org**
2. Download the **LTS** version (big green button)
3. Run the installer — click Next through everything
4. To confirm it worked, open **Terminal** (Mac) or **Command Prompt** (Windows)
   and type:
   ```
   node --version
   ```
   You should see something like `v20.x.x`

---

## STEP 2 — Set Up Firebase (free, 5 min)

Firebase is Google's free real-time database. This is what syncs scores across all phones.

1. Go to **https://console.firebase.google.com**
2. Sign in with a Google account (your personal Gmail is fine)
3. Click **"Add project"**
4. Name it: `mulligan-men-2025` → click Continue
5. Disable Google Analytics (not needed) → click **"Create project"**
6. Once created, click **"</> Web"** (the web app icon)
7. Register the app — nickname it `mulligan-men` → click **"Register app"**
8. You'll see a code block with `firebaseConfig`. **Copy the whole config object** — you'll need it in Step 4.
9. Click **"Continue to console"**

### Set up the Realtime Database:
10. In the left sidebar → **Build → Realtime Database**
11. Click **"Create Database"**
12. Choose your region (us-central1 is fine) → click Next
13. Select **"Start in test mode"** → click **"Enable"**
    _(Test mode lets anyone read/write for 30 days — perfect for the tournament.
    After the trip you can just delete the project.)_

---

## STEP 3 — Get the App Files Ready

1. Download the `mulligan-men` project folder (from wherever you saved it)
2. Open **Terminal** (Mac) or **Command Prompt** (Windows)
3. Navigate to the project folder:
   ```
   cd path/to/mulligan-men
   ```
   For example: `cd Desktop/mulligan-men`
4. Install dependencies:
   ```
   npm install
   ```
   This takes 1–2 minutes the first time.

---

## STEP 4 — Add Your Firebase Credentials

1. Open the file `src/firebase.js` in any text editor
   (Notepad on Windows, TextEdit on Mac, or VS Code if you have it)
2. Replace the placeholder values with your actual Firebase config:

   **Before:**
   ```js
   const firebaseConfig = {
     apiKey:            "YOUR_API_KEY",
     authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
     databaseURL:       "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
     projectId:         "YOUR_PROJECT_ID",
     storageBucket:     "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId:             "YOUR_APP_ID",
   };
   ```

   **After (example — use YOUR values from Step 2):**
   ```js
   const firebaseConfig = {
     apiKey:            "AIzaSyAbc123...",
     authDomain:        "mulligan-men-2025.firebaseapp.com",
     databaseURL:       "https://mulligan-men-2025-default-rtdb.firebaseio.com",
     projectId:         "mulligan-men-2025",
     storageBucket:     "mulligan-men-2025.appspot.com",
     messagingSenderId: "123456789",
     appId:             "1:123456789:web:abc123",
   };
   ```

3. Save the file.

---

## STEP 5 — Test Locally (Optional but Recommended)

In your terminal (inside the `mulligan-men` folder):
```
npm start
```
This opens the app at **http://localhost:3000** in your browser.
Try adding a score — if it saves and shows 🟢 Live, Firebase is connected!

Press `Ctrl+C` to stop the local server when done.

---

## STEP 6 — Deploy to Vercel (Free, 5 min)

This puts it on the internet so everyone can access it.

1. Go to **https://vercel.com** and sign up (free — use GitHub or Google)
2. Click **"Add New Project"**
3. Choose **"Browse"** and select your `mulligan-men` folder
4. Vercel will auto-detect it as a React app
5. Click **"Deploy"** — takes about 60 seconds
6. You'll get a URL like `https://mulligan-men-abc123.vercel.app`

**Customize your URL (optional):**
- In Vercel → your project → Settings → Domains
- You can set a custom name like `mulligan-men-2025.vercel.app`

---

## STEP 7 — Share with the Group

Send the URL in your group chat:
> "Mulligan Men 2025 Live Leaderboard 🏌️⛳
> https://mulligan-men-2025.vercel.app
> Open on your phone and bookmark it!"

**On iPhone:** Open in Safari → Share button → "Add to Home Screen"
**On Android:** Open in Chrome → three dots menu → "Add to Home Screen"

It will appear as an app icon on their home screen.

---

## How Scoring Works During the Trip

- **One person enters scores** (you, or a designated scorer per round)
- Everyone else sees updates in real time — the leaderboard refreshes automatically
- Scores are color-coded: 🟢 under par, 🟡 even, 🔴 over par
- After Round 3, the commissioner taps **🎯 Flights** → **SET FLIGHTS NOW**
- Flights are saved and visible to all 21 players instantly

---

## Troubleshooting

| Problem | Fix |
|---|---|
| 🔴 Offline shown | Check your Firebase `databaseURL` in firebase.js |
| Scores not syncing | Make sure Realtime Database is created (not Firestore) |
| "Permission denied" error | Make sure you chose "Test mode" when creating the database |
| App won't start locally | Run `npm install` again, then `npm start` |
| Vercel deploy fails | Make sure `src/firebase.js` has real values, not "YOUR_API_KEY" |

---

## After the Tournament

When the trip is done, just go to **Firebase Console → your project → delete project**.
That wipes all the data. The Vercel URL will still exist but show no scores.

---

*Built for the Mulligan Men · Myrtle Beach 2025*
