import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { TMDBMovie } from "../services/tmdb";
import { CollectionItem, CollectionsState } from "../types";
import { getMoviesCollections, saveMoviesCollections, getMoviesWatchLater, saveMoviesWatchLater, mergeFirestoreData } from "../utils";

export interface MovieWatchLaterItem {
  id: number;
  title: string;
  posterPath: string;
  backdropPath?: string;
  addedAt: string;
}

// Global cache
let globalCollections: CollectionsState = { toBinge: [], watched: [] };
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
            globalCollections = movieData.collections || getMoviesCollections();
            globalWatchLater = movieData.watchLater || [];
          } else {
            globalCollections = getMoviesCollections();
            globalWatchLater = getMoviesWatchLater();
          }
        } else {
          globalCollections = getMoviesCollections();
          globalWatchLater = getMoviesWatchLater();
        }
      } catch (err) {
        console.error(
          "[useMoviesData] Failed to fetch user data from Firestore:",
          err
        );
        globalCollections = getMoviesCollections();
        globalWatchLater = getMoviesWatchLater();
      } finally {
        isGlobalLoading = false;
        notifyListeners();
      }
    } else {
      globalCollections = { toBinge: [], watched: [] };
      globalWatchLater = [];
      isGlobalLoading = false;
      notifyListeners();
    }
  });
}

export function useMoviesData() {
  const [collections, setCollections] = useState<CollectionsState>(globalCollections);
  const [watchLater, setWatchLater] =
    useState<MovieWatchLaterItem[]>(globalWatchLater);
  const [currentUser, setCurrentUser] = useState<User | null>(
    globalCurrentUser
  );
  const [isLoading, setIsLoading] = useState(isGlobalLoading);

  useEffect(() => {
    const handleUpdate = () => {
      setCollections(globalCollections);
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

  const isInSpecificCollection = (collectionName: "toBinge" | "watched", id: number) => {
    return (collections[collectionName] || []).some((item) => item.id === id || item.tmdbId === id);
  };

  const isInLibrary = (id: number) => {
    return (
      (collections.toBinge || []).some((item) => item.id === id || item.tmdbId === id) ||
      (collections.watched || []).some((item) => item.id === id || item.tmdbId === id)
    );
  };

  const isInWatchLater = (id: number) => watchLater.some((item) => item.id === id);

  const addToCollection = (collectionName: "toBinge" | "watched", movie: TMDBMovie) => {
    const currentList = globalCollections[collectionName] || [];
    if (currentList.some((item) => item.id === movie.id)) return;

    const newItem: CollectionItem = {
      id: movie.id,
      title: movie.title,
      posterPath: movie.poster_path || "",
      coverImage: movie.poster_path || "",
      backdropPath: movie.backdrop_path || "",
      bannerImage: movie.backdrop_path || "",
      type: "movie",
      addedAt: new Date().toISOString(),
      tmdbId: movie.id,
    };

    const updated = {
      ...globalCollections,
      [collectionName]: [newItem, ...currentList],
    };

    globalCollections = updated;
    notifyListeners();
    saveMoviesCollections(updated);
  };

  const removeFromCollection = (collectionName: "toBinge" | "watched", id: number) => {
    const updated = {
      ...globalCollections,
      [collectionName]: (globalCollections[collectionName] || []).filter(
        (item) => item.id !== id && item.tmdbId !== id
      ),
    };

    globalCollections = updated;
    notifyListeners();
    saveMoviesCollections(updated);
  };

  const toggleLibrary = async (movie: TMDBMovie) => {
    const exists = isInLibrary(movie.id);
    if (exists) {
      removeFromCollection("toBinge", movie.id);
      removeFromCollection("watched", movie.id);
    } else {
      addToCollection("toBinge", movie);
    }
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

  // Compatibility array for libraries list
  const library = [
    ...(collections.toBinge || []),
    ...(collections.watched || []),
  ];

  return {
    library,
    collections,
    watchLater,
    isLoading,
    isInLibrary,
    isInSpecificCollection,
    addToCollection,
    removeFromCollection,
    toggleLibrary,
    isInWatchLater,
    toggleWatchLater,
    currentUser,
  };
}
