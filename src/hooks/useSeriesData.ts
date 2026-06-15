import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { TMDBTVShow } from "../services/tmdb";
import { CollectionItem, CollectionsState } from "../types";
import { getSeriesCollections, saveSeriesCollections, getSeriesWatchLater, saveSeriesWatchLater, mergeFirestoreData } from "../utils";

export interface SeriesWatchLaterItem {
  id: number;
  title: string;
  posterPath: string;
  backdropPath?: string;
  addedAt: string;
}

// Global cache
let globalCollections: CollectionsState = { toBinge: [], watched: [] };
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
            globalCollections = seriesData.collections || getSeriesCollections();
            globalWatchLater = seriesData.watchLater || [];
          } else {
            globalCollections = getSeriesCollections();
            globalWatchLater = getSeriesWatchLater();
          }
        } else {
          globalCollections = getSeriesCollections();
          globalWatchLater = getSeriesWatchLater();
        }
      } catch (err) {
        console.error(
          "[useSeriesData] Failed to fetch user data from Firestore:",
          err
        );
        globalCollections = getSeriesCollections();
        globalWatchLater = getSeriesWatchLater();
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

export function useSeriesData() {
  const [collections, setCollections] = useState<CollectionsState>(globalCollections);
  const [watchLater, setWatchLater] =
    useState<SeriesWatchLaterItem[]>(globalWatchLater);
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

  const addToCollection = (collectionName: "toBinge" | "watched", series: TMDBTVShow) => {
    const currentList = globalCollections[collectionName] || [];
    if (currentList.some((item) => item.id === series.id)) return;

    const newItem: CollectionItem = {
      id: series.id,
      title: series.name,
      posterPath: series.poster_path || "",
      coverImage: series.poster_path || "",
      backdropPath: series.backdrop_path || "",
      bannerImage: series.backdrop_path || "",
      type: "series",
      addedAt: new Date().toISOString(),
      tmdbId: series.id,
    };

    const updated = {
      ...globalCollections,
      [collectionName]: [newItem, ...currentList],
    };

    globalCollections = updated;
    notifyListeners();
    saveSeriesCollections(updated);
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
    saveSeriesCollections(updated);
  };

  const toggleLibrary = async (series: TMDBTVShow) => {
    const exists = isInLibrary(series.id);
    if (exists) {
      removeFromCollection("toBinge", series.id);
      removeFromCollection("watched", series.id);
    } else {
      addToCollection("toBinge", series);
    }
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
