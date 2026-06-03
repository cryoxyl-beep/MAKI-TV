import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
  NextOrObserver,
  ErrorFn,
  CompleteFn,
  Unsubscribe
} from "firebase/auth";
import { auth } from "../lib/firebase";

/**
 * Creates a new user account with the specified email and password.
 */
export async function signUp(email: string, password: string): Promise<User> {
  if (!auth) {
    throw new Error("[Firebase Error] Auth is not initialized.");
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("[Firebase Error] Sign up error:", error);
    throw error;
  }
}

/**
 * Signs in an existing user with email and password.
 */
export async function signIn(email: string, password: string): Promise<User> {
  if (!auth) {
    throw new Error("[Firebase Error] Auth is not initialized.");
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("[Firebase Error] Sign in error:", error);
    throw error;
  }
}

/**
 * Signs out the current user.
 */
export async function signOut(): Promise<void> {
  if (!auth) {
    throw new Error("[Firebase Error] Auth is not initialized.");
  }
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("[Firebase Error] Sign out error:", error);
    throw error;
  }
}

/**
 * Returns the currently signed-in user or null.
 */
export function getCurrentUser(): User | null {
  if (!auth) return null;
  return auth.currentUser;
}

/**
 * Subscribes to changes in authentication state.
 */
export function onAuthStateChanged(
  nextOrObserver: NextOrObserver<User>,
  error?: ErrorFn,
  completed?: CompleteFn
): Unsubscribe {
  if (!auth) {
    // Return a dummy unsubscribe function if auth is not initialized
    return () => {};
  }
  return firebaseOnAuthStateChanged(auth, nextOrObserver, error, completed);
}
