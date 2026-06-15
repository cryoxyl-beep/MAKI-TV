import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { TMDBTVShow } from "../services/tmdb";

export interface SeriesLibraryItem {
  id: number;
  title: string;
  posterPath: string;
  backdropPath?: string;
  addedAt: string;
}

export interface SeriesWatchLaterItem {
  id: number;
  title: string;
  posterPath: string;
  backdropPath?: string;
  addedAt: string;
}

// Global cache
let globalLibrary: SeriesLibraryItem[] = [];
let globalWatchLater: SeriesWatchLaterItem[] = [];
let globalCurrentUser: User | null = null;
let isGlobalLoading = true;
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

if (auth) {
  onAuthStateChanged(auth, async (user) => {
    globalCurrentUser = user;
    if (user) {
      isGlobalLoading = true;
      notifyListeners();
      try {
        if (db) {
          const docRef = doc(db, "seriesData", user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            globalLibrary = snap.data().library || [];
            globalWatchLater = snap.data().watchLater || [];
          } else {
            globalLibrary = [];
            globalWatchLater = [];
          }
        }
      } catch (err) {
        console.error("[useSeriesData] Failed to fetch user seriesData from Firestore:", err);
      } finally {
        isGlobalLoading = false;
        notifyListeners();
      }
    } else {
      globalLibrary = [];
      globalWatchLater = [];
      isGlobalLoading = false;
      notifyListeners();
    }
  });
}

const syncToFirebase = async () => {
    if (!globalCurrentUser || !db) return;
    const docRef = doc(db, "seriesData", globalCurrentUser.uid);
    try {
        const payload = JSON.parse(JSON.stringify({ library: globalLibrary, watchLater: globalWatchLater }));
        await setDoc(docRef, payload, { merge: true });
    } catch(err) {
        console.error("[useSeriesData] Failed to sync to Firestore:", err);
    }
};

export function useSeriesData() {
  const [library, setLibrary] = useState<SeriesLibraryItem[]>(globalLibrary);
  const [watchLater, setWatchLater] = useState<SeriesWatchLaterItem[]>(globalWatchLater);
  const [currentUser, setCurrentUser] = useState<User | null>(globalCurrentUser);
  const [isLoading, setIsLoading] = useState(isGlobalLoading);

  useEffect(() => {
    const handleUpdate = () => {
      setLibrary(globalLibrary);
      setWatchLater(globalWatchLater);
      setCurrentUser(globalCurrentUser);
      setIsLoading(isGlobalLoading);
    };
    listeners.add(handleUpdate);
    handleUpdate();
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const isInLibrary = (id: number) => library.some((item) => item.id === id);
  const isInWatchLater = (id: number) => watchLater.some((item) => item.id === id);

  const toggleLibrary = async (series: TMDBTVShow) => {
    if (!globalCurrentUser) {
      alert("Please login to add to library");
      return false;
    }
    const exists = isInLibrary(series.id);
    if (exists) {
        globalLibrary = globalLibrary.filter((item) => item.id !== series.id);
    } else {
        globalLibrary = [{
            id: series.id,
            title: series.name,
            posterPath: series.poster_path || "",
            backdropPath: series.backdrop_path || "",
            addedAt: new Date().toISOString()
        }, ...globalLibrary];
    }
    notifyListeners();
    await syncToFirebase();
    return !exists;
  };

  const toggleWatchLater = async (series: TMDBTVShow) => {
    if (!globalCurrentUser) {
      alert("Please login to add to watch later");
      return false;
    }
    const exists = isInWatchLater(series.id);
    if (exists) {
        globalWatchLater = globalWatchLater.filter((item) => item.id !== series.id);
    } else {
        globalWatchLater = [{
            id: series.id,
            title: series.name,
            posterPath: series.poster_path || "",
            backdropPath: series.backdrop_path || "",
            addedAt: new Date().toISOString()
        }, ...globalWatchLater];
    }
    notifyListeners();
    await syncToFirebase();
    return !exists;
  };

  return {
    library,
    watchLater,
    isLoading,
    isInLibrary,
    isInWatchLater,
    toggleLibrary,
    toggleWatchLater,
    currentUser,
  };
}
