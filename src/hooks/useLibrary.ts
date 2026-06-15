import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { AniListAnime, CollectionItem, CollectionsState } from "../types";
import { getAnimeCollections, saveAnimeCollections, mergeFirestoreData } from "../utils";

// Global state cache to keep all hook instances synchronized
let globalCollections: CollectionsState = { toBinge: [], watched: [] };
let globalCurrentUser: User | null = null;
let isGlobalLoading = true;
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

// Initialize auth listener just once
if (auth) {
  onAuthStateChanged(auth, async (user) => {
    globalCurrentUser = user;
    if (user) {
      isGlobalLoading = true;
      notifyListeners();
      try {
        if (db) {
          const userRef = doc(db, "users", user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data();
            
            // Overwrite/merge local storage
            mergeFirestoreData(data);

            const animeData = data.anime || {};
            globalCollections = animeData.collections || getAnimeCollections();
          } else {
            globalCollections = getAnimeCollections();
          }
        } else {
          globalCollections = getAnimeCollections();
        }
      } catch (err) {
        console.error(
          "[useLibrary] Failed to fetch user data from Firestore:",
          err
        );
        globalCollections = getAnimeCollections();
      } finally {
        isGlobalLoading = false;
        notifyListeners();
      }
    } else {
      globalCollections = { toBinge: [], watched: [] };
      isGlobalLoading = false;
      notifyListeners();
    }
  });
}

export function useLibrary() {
  const [collections, setCollections] = useState<CollectionsState>(globalCollections);
  const [currentUser, setCurrentUser] = useState<User | null>(globalCurrentUser);
  const [isLoading, setIsLoading] = useState(isGlobalLoading);

  useEffect(() => {
    const handleUpdate = () => {
      setCollections(globalCollections);
      setCurrentUser(globalCurrentUser);
      setIsLoading(isGlobalLoading);
    };
    listeners.add(handleUpdate);
    handleUpdate(); // Pick up initial state
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const isSubscribed = (animeId: number) => {
    return (
      (collections.toBinge || []).some((item) => item.animeId === animeId || item.id === animeId) ||
      (collections.watched || []).some((item) => item.animeId === animeId || item.id === animeId)
    );
  };

  const isInSpecificCollection = (collectionName: "toBinge" | "watched", animeId: number) => {
    return (collections[collectionName] || []).some(
      (item) => item.animeId === animeId || item.id === animeId
    );
  };

  const addToCollection = (collectionName: "toBinge" | "watched", anime: AniListAnime) => {
    const currentList = globalCollections[collectionName] || [];
    if (currentList.some((item) => item.id === anime.id)) return;

    const newItem: CollectionItem = {
      id: anime.id,
      title:
        anime.title.english ||
        anime.title.romaji ||
        anime.title.userPreferred ||
        "Untitled Anime",
      posterPath: anime.coverImage.large || anime.coverImage.medium || "",
      coverImage: anime.coverImage.large || anime.coverImage.medium || "",
      bannerImage: anime.bannerImage || "",
      backdropPath: anime.bannerImage || "",
      type: "anime",
      addedAt: new Date().toISOString(),
      animeId: anime.id,
    };

    const updated = {
      ...globalCollections,
      [collectionName]: [newItem, ...currentList],
    };

    globalCollections = updated;
    notifyListeners();
    saveAnimeCollections(updated);
  };

  const removeFromCollection = (collectionName: "toBinge" | "watched", animeId: number) => {
    const updated = {
      ...globalCollections,
      [collectionName]: (globalCollections[collectionName] || []).filter(
        (item) => item.id !== animeId && item.animeId !== animeId
      ),
    };

    globalCollections = updated;
    notifyListeners();
    saveAnimeCollections(updated);
  };

  const toggleSubscription = async (anime: AniListAnime) => {
    const active = isSubscribed(anime.id);
    if (active) {
      removeFromCollection("toBinge", anime.id);
      removeFromCollection("watched", anime.id);
    } else {
      addToCollection("toBinge", anime);
    }
    return !active;
  };

  // Map to compatible array/structure
  const library = [
    ...(collections.toBinge || []).map(item => ({
      ...item,
      animeId: item.animeId || item.id,
      animeTitle: item.title,
      coverImage: item.posterPath || item.coverImage || "",
      bannerImage: item.backdropPath || item.bannerImage || "",
      subscribedAt: item.addedAt,
    })),
    ...(collections.watched || []).map(item => ({
      ...item,
      animeId: item.animeId || item.id,
      animeTitle: item.title,
      coverImage: item.posterPath || item.coverImage || "",
      bannerImage: item.backdropPath || item.bannerImage || "",
      subscribedAt: item.addedAt,
    })),
  ];

  return {
    library,
    collections,
    isLoading,
    isSubscribed,
    isInSpecificCollection,
    addToCollection,
    removeFromCollection,
    toggleSubscription,
    currentUser,
  };
}
