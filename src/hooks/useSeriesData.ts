import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { TMDBTVShow } from "../services/tmdb";
import { getSeriesLibrary, saveSeriesLibrary, getSeriesWatchLater, saveSeriesWatchLater, mergeFirestoreData } from "../utils";

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
          const docRef = doc(db, "users", user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            
            // Sync all user sections to local storage
            mergeFirestoreData(data);

            const seriesData = data.series || {};
            globalLibrary = seriesData.library || [];
            globalWatchLater = seriesData.watchLater || [];
          } else {
            globalLibrary = getSeriesLibrary();
            globalWatchLater = getSeriesWatchLater();
          }
        } else {
          globalLibrary = getSeriesLibrary();
          globalWatchLater = getSeriesWatchLater();
        }
      } catch (err) {
        console.error(
          "[useSeriesData] Failed to fetch user data from Firestore:",
          err
        );
        globalLibrary = getSeriesLibrary();
        globalWatchLater = getSeriesWatchLater();
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

export function useSeriesData() {
  const [library, setLibrary] = useState<SeriesLibraryItem[]>(globalLibrary);
  const [watchLater, setWatchLater] =
    useState<SeriesWatchLaterItem[]>(globalWatchLater);
  const [currentUser, setCurrentUser] = useState<User | null>(
    globalCurrentUser
  );
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
  const isInWatchLater = (id: number) =>
    watchLater.some((item) => item.id === id);

  const toggleLibrary = async (series: TMDBTVShow) => {
    const exists = isInLibrary(series.id);
    let updated: SeriesLibraryItem[];
    if (exists) {
      updated = globalLibrary.filter((item) => item.id !== series.id);
    } else {
      updated = [
        {
          id: series.id,
          title: series.name,
          posterPath: series.poster_path || "",
          backdropPath: series.backdrop_path || "",
          addedAt: new Date().toISOString(),
        },
        ...globalLibrary,
      ];
    }
    globalLibrary = updated;
    notifyListeners();
    saveSeriesLibrary(updated);
    return !exists;
  };

  const toggleWatchLater = async (series: TMDBTVShow) => {
    const exists = isInWatchLater(series.id);
    let updated: SeriesWatchLaterItem[];
    if (exists) {
      updated = globalWatchLater.filter((item) => item.id !== series.id);
    } else {
      updated = [
        {
          id: series.id,
          title: series.name,
          posterPath: series.poster_path || "",
          backdropPath: series.backdrop_path || "",
          addedAt: new Date().toISOString(),
        },
        ...globalWatchLater,
      ];
    }
    globalWatchLater = updated;
    notifyListeners();
    saveSeriesWatchLater(updated);
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
