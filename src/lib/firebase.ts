import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, doc, getDocFromServer } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA657V4nAGpH6vpBxiiuLAs4449DVwrGBY",
  authDomain: "mockgo-ai.firebaseapp.com",
  projectId: "mockgo-ai",
  storageBucket: "mockgo-ai.firebasestorage.app",
  messagingSenderId: "1083843518105",
  appId: "1:1083843518105:web:1e715874380a1522fee208"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  if (app) {
    db = getFirestore(app);
    auth = getAuth(app);
    // Run connection validation in background as mandated by instructions
    testConnection(db);
  }
} catch (error) {
  // Silent fallback to prevent blocking/crashing
}

// Validation connection helper from SKILL.md
async function testConnection(database: Firestore) {
  try {
    await getDocFromServer(doc(database, "test", "connection"));
  } catch (error) {
    // Silent fallback
  }
}

export { app, auth, db };
