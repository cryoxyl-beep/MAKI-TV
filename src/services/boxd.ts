import { db } from "../lib/firebase";
import { 
  collection, doc, setDoc, getDoc, getDocs, query, where, 
  onSnapshot, deleteDoc, updateDoc, serverTimestamp, arrayUnion, arrayRemove
} from "firebase/firestore";
import { User } from "firebase/auth";

export interface BoxdGroup {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: any;
  memberIds: string[];
}

export interface BoxdMember {
  uid: string;
  displayName: string;
  photoURL: string;
  joinedAt: any;
}

export interface BoxdTitle {
  id: string; // Type + ID e.g. 'movie_123', 'anime_456'
  type: 'movie' | 'tv' | 'anime';
  externalId: string | number;
  title: string;
  poster: string;
  backdrop: string;
  addedBy: string;
  addedAt: any;
}

export interface BoxdRating {
  id: string; // Usually titleId_userId or titleId_episodeId_userId
  titleId: string;
  episodeId: string | null;
  userId: string;
  rating: number;
  review: string;
  updatedAt: any;
}

// Generate random 5-char alphanumeric invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createGroup(name: string, user: User) {
  const inviteCode = generateInviteCode();
  const groupRef = doc(collection(db, "boxd"));
  const groupData: Omit<BoxdGroup, 'id'> = {
    name,
    inviteCode,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    memberIds: [user.uid]
  };
  await setDoc(groupRef, groupData);
  
  // Add creator as detailed member
  await joinGroup(groupRef.id, user, true);
  
  return groupRef.id;
}

export async function joinGroup(groupId: string, user: User, isCreator = false) {
  const groupRef = doc(db, "boxd", groupId);
  if (!isCreator) {
    await updateDoc(groupRef, {
      memberIds: arrayUnion(user.uid)
    });
  }

  const memberRef = doc(db, `boxd/${groupId}/members`, user.uid);
  const docSnap = await getDoc(memberRef);
  if (!docSnap.exists()) {
    await setDoc(memberRef, {
      uid: user.uid,
      displayName: user.displayName || "Unknown",
      photoURL: user.photoURL || "",
      joinedAt: serverTimestamp()
    });
  }
}

export async function getGroupByInviteCode(code: string): Promise<BoxdGroup | null> {
  const q = query(collection(db, "boxd"), where("inviteCode", "==", code.toUpperCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as BoxdGroup;
}

export function subscribeToUserGroups(userId: string, callback: (groups: BoxdGroup[]) => void) {
  const q = query(collection(db, "boxd"), where("memberIds", "array-contains", userId));
  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BoxdGroup));
    callback(groups.sort((a, b) => {
      // Sort by creation desc if available
      if (a.createdAt && b.createdAt) return b.createdAt.toMillis() - a.createdAt.toMillis();
      return 0;
    }));
  });
}

export function subscribeToGroup(groupId: string, callback: (group: BoxdGroup | null) => void) {
  return onSnapshot(doc(db, "boxd", groupId), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as BoxdGroup);
    } else {
      callback(null);
    }
  });
}

export function subscribeToMembers(groupId: string, callback: (members: BoxdMember[]) => void) {
  return onSnapshot(collection(db, `boxd/${groupId}/members`), (snapshot) => {
    const members = snapshot.docs.map(doc => doc.data() as BoxdMember);
    callback(members);
  });
}

export function subscribeToTitles(groupId: string, callback: (titles: BoxdTitle[]) => void) {
  return onSnapshot(collection(db, `boxd/${groupId}/titles`), (snapshot) => {
    const titles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BoxdTitle));
    callback(titles);
  });
}

export function subscribeToRatings(groupId: string, callback: (ratings: BoxdRating[]) => void) {
  return onSnapshot(collection(db, `boxd/${groupId}/ratings`), (snapshot) => {
    const ratings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BoxdRating));
    callback(ratings);
  });
}

export async function addTitle(groupId: string, title: BoxdTitle) {
  const titleRef = doc(db, `boxd/${groupId}/titles`, title.id);
  const snap = await getDoc(titleRef);
  if (!snap.exists()) {
    await setDoc(titleRef, {
      ...title,
      addedAt: serverTimestamp()
    });
  }
}

export async function removeTitle(groupId: string, titleId: string) {
  // We should also ideally remove ratings associated with it, but simple delete works for isolated features
  await deleteDoc(doc(db, `boxd/${groupId}/titles`, titleId));
  // In a real app we'd trigger a cloud function or batch delete ratings, but for this constraint we keep it simple
}

export async function submitRating(
  groupId: string, 
  titleId: string, 
  episodeId: string | null, 
  userId: string, 
  rating: number, 
  review: string
) {
  const ratingId = episodeId ? `${titleId}_${episodeId}_${userId}` : `${titleId}_${userId}`;
  const ratingRef = doc(db, `boxd/${groupId}/ratings`, ratingId);
  
  if (rating === 0 && !review) {
    // Delete if 0 stars and no review
    await deleteDoc(ratingRef);
  } else {
    await setDoc(ratingRef, {
      id: ratingId,
      titleId,
      episodeId,
      userId,
      rating,
      review,
      updatedAt: serverTimestamp()
    });
  }
}
