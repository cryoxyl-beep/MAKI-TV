import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { TMDBMovie } from "../services/tmdb";
import { getMoviesLibrary, saveMoviesLibrary, getMoviesWatchLater, saveMoviesWatchLater, mergeFirestoreData } from "../utils";

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
          const docRef = doc(db, "users", user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            
            // Sync all user sections to local storage
            mergeFirestoreData(data);

            const movieData = data.movies || {};
            globalLibrary = movieData.library || [];
            globalWatchLater = movieData.watchLater || [];
          } else {
            globalLibrary = getMoviesLibrary();
            globalWatchLater = getMoviesWatchLater();
          }
        } else {
          globalLibrary = getMoviesLibrary();
          globalWatchLater = getMoviesWatchLater();
        }
      } catch (err) {
        console.error(
          "[useMoviesData] Failed to fetch user data from Firestore:",
          err
        );
        globalLibrary = getMoviesLibrary();
        globalWatchLater = getMoviesWatchLater();
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

export function useMoviesData() {
  const [library, setLibrary] = useState<MovieLibraryItem[]>(globalLibrary);
  const [watchLater, setWatchLater] =
    useState<MovieWatchLaterItem[]>(globalWatchLater);
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

  const toggleLibrary = async (movie: TMDBMovie) => {
    const exists = isInLibrary(movie.id);
    let updated: MovieLibraryItem[];
    if (exists) {
      updated = globalLibrary.filter((item) => item.id !== movie.id);
    } else {
      updated = [
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
    globalLibrary = updated;
    notifyListeners();
    saveMoviesLibrary(updated);
    return !exists;
  };

  const toggleWatchLater = async (movie: TMDBMovie) => {
    const exists = isInWatchLater(movie.id);
    let updated: MovieWatchLaterItem[];
    if (exists) {
      updated = globalWatchLater.filter((item) => item.id !== movie.id);
    } else {
      updated = [
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
    globalWatchLater = updated;
    notifyListeners();
    saveMoviesWatchLater(updated);
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
