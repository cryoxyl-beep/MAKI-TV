import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { TMDBMovie } from "../services/tmdb";
import { storage, mergeFirebaseHistory } from "../utils";

export interface MovieLibraryItem {
  id: number;
  title: string;
  posterPath: string;
  backdropPath?: string;
  addedAt: string;
}

export interface MovieWatchLaterItem {
  id: number;
  title: string;
  posterPath: string;
  backdropPath?: string;
  addedAt: string;
}

// Global cache
let globalLibrary: MovieLibraryItem[] = [];
let globalWatchLater: MovieWatchLaterItem[] = [];
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
          const docRef = doc(db, "moviesData", user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            globalLibrary = data.library || [];
            globalWatchLater = data.watchLater || [];
            if (data.history) mergeFirebaseHistory(data.history);
          } else {
            globalLibrary = [];
            globalWatchLater = [];
          }
        }
      } catch (err) {
        console.error(
          "[useMoviesData] Failed to fetch user moviesData from Firestore:",
          err,
        );
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
  const docRef = doc(db, "moviesData", globalCurrentUser.uid);
  try {
    const payload = JSON.parse(
      JSON.stringify({ library: globalLibrary, watchLater: globalWatchLater }),
    );
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.error("[useMoviesData] Failed to sync to Firestore:", err);
  }
};

export function useMoviesData() {
  const [library, setLibrary] = useState<MovieLibraryItem[]>(globalLibrary);
  const [watchLater, setWatchLater] =
    useState<MovieWatchLaterItem[]>(globalWatchLater);
  const [currentUser, setCurrentUser] = useState<User | null>(
    globalCurrentUser,
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

  const toggleLibrary = async (movie: TMDBMovie) => {
    if (!globalCurrentUser) {
      alert("Please login to add to library");
      return false;
    }
    const exists = isInLibrary(movie.id);
    if (exists) {
      globalLibrary = globalLibrary.filter((item) => item.id !== movie.id);
    } else {
      globalLibrary = [
        {
          id: movie.id,
          title: movie.title,
          posterPath: movie.poster_path || "",
          backdropPath: movie.backdrop_path || "",
          addedAt: new Date().toISOString(),
        },
        ...globalLibrary,
      ];
    }
    notifyListeners();
    await syncToFirebase();
    return !exists;
  };

  const toggleWatchLater = async (movie: TMDBMovie) => {
    if (!globalCurrentUser) {
      alert("Please login to add to watch later");
      return false;
    }
    const exists = isInWatchLater(movie.id);
    if (exists) {
      globalWatchLater = globalWatchLater.filter(
        (item) => item.id !== movie.id,
      );
    } else {
      globalWatchLater = [
        {
          id: movie.id,
          title: movie.title,
          posterPath: movie.poster_path || "",
          backdropPath: movie.backdrop_path || "",
          addedAt: new Date().toISOString(),
        },
        ...globalWatchLater,
      ];
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
