import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, Firestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log("[Firebase] App Initialized");
  } else {
    app = getApp();
  }

  // Ensure config contains required database ID
  if (app) {
    const dbId = (firebaseConfig as any).firestoreDatabaseId;
    db = getFirestore(app, dbId);
    console.log("[Firebase] Firestore Initialized");

    auth = getAuth(app);
    console.log("[Firebase] Auth Initialized");

    // Static listener to log current user state
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log(`[Firebase] Current User:\n${user.uid}`);
      } else {
        console.log("[Firebase] Current User: null");
      }
    });

    // Run connection validation in background as mandated by instructions
    testConnection(db);
  }
} catch (error) {
  console.error("[Firebase Error] Initialization failed:", error);
}

// Validation connection helper from SKILL.md
async function testConnection(database: Firestore) {
  try {
    await getDocFromServer(doc(database, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

export { app, auth, db };
