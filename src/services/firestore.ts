import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  QueryConstraint,
  DocumentData,
  WithFieldValue,
  UpdateData
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Centrally handles Firestore permission and execution errors by formatting 
 * them as JSON string conforming to FirestoreErrorInfo interface as mandated.
 */
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Gets a document from a collection by its ID.
 */
export async function getDocument<T = DocumentData>(collectionPath: string, docId: string): Promise<T | null> {
  if (!db) {
    throw new Error("[Firebase Error] Firestore is not initialized.");
  }
  const fullPath = `${collectionPath}/${docId}`;
  try {
    const docRef = doc(db, collectionPath, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as T;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, fullPath);
  }
}

/**
 * Overwrites or creates a document under a collection with a specific ID.
 */
export async function setDocument<T extends WithFieldValue<DocumentData>>(
  collectionPath: string, 
  docId: string, 
  data: T
): Promise<void> {
  if (!db) {
    throw new Error("[Firebase Error] Firestore is not initialized.");
  }
  const fullPath = `${collectionPath}/${docId}`;
  try {
    const docRef = doc(db, collectionPath, docId);
    await setDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, fullPath);
  }
}

/**
 * Updates an existing document fields.
 */
export async function updateDocument<T extends DocumentData>(
  collectionPath: string, 
  docId: string, 
  data: UpdateData<T>
): Promise<void> {
  if (!db) {
    throw new Error("[Firebase Error] Firestore is not initialized.");
  }
  const fullPath = `${collectionPath}/${docId}`;
  try {
    const docRef = doc(db, collectionPath, docId);
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, fullPath);
  }
}

/**
 * Deletes a document from a collection.
 */
export async function deleteDocument(collectionPath: string, docId: string): Promise<void> {
  if (!db) {
    throw new Error("[Firebase Error] Firestore is not initialized.");
  }
  const fullPath = `${collectionPath}/${docId}`;
  try {
    const docRef = doc(db, collectionPath, docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, fullPath);
  }
}

/**
 * Queries a collection and retrieves all documents matching constraints.
 */
export async function queryCollection<T = DocumentData>(
  collectionPath: string, 
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  if (!db) {
    throw new Error("[Firebase Error] Firestore is not initialized.");
  }
  try {
    const colRef = collection(db, collectionPath);
    const q = query(colRef, ...constraints);
    const querySnapshot = await getDocs(q);
    const results: T[] = [];
    querySnapshot.forEach((docSnap) => {
      results.push(docSnap.data() as T);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
}
