import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AniListAnime } from "../types";
import { getAnimeLibrary, saveAnimeLibrary, mergeFirestoreData } from "../utils";

export interface LibraryItem {
  animeId: number;
  animeTitle: string;
  coverImage: string;
  bannerImage?: string;
  subscribedAt: string;
}

// Global state cache to keep all hook instances synchronized
let globalLibrary: LibraryItem[] = [];
let globalCurrentUser: User | null = null;
let isGlobalLoading = true;
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

// Map items from raw SubscriptionItem to LibraryItem
function mapToLibraryItems(items: any[]): LibraryItem[] {
  return items.map((item) => ({
    animeId: item.animeId || item.id,
    animeTitle: item.animeTitle || item.title,
    coverImage: item.coverImage || item.thumbnail || "",
    bannerImage: item.bannerImage || "",
    subscribedAt: item.subscribedAt || item.addedAt || new Date().toISOString(),
  }));
}

// Map items from LibraryItem to SubscriptionItem
function mapToSubscriptionItems(items: LibraryItem[]) {
  return items.map((item) => ({
    animeId: item.animeId,
    animeTitle: item.animeTitle,
    coverImage: item.coverImage,
    bannerImage: item.bannerImage,
    subscribedAt: item.subscribedAt,
  }));
}

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
            globalLibrary = mapToLibraryItems(animeData.library || []);
          } else {
            globalLibrary = mapToLibraryItems(getAnimeLibrary());
          }
        } else {
          globalLibrary = mapToLibraryItems(getAnimeLibrary());
        }
      } catch (err) {
        console.error(
          "[useLibrary] Failed to fetch user data from Firestore:",
          err
        );
        globalLibrary = mapToLibraryItems(getAnimeLibrary());
      } finally {
        isGlobalLoading = false;
        notifyListeners();
      }
    } else {
      globalLibrary = [];
      isGlobalLoading = false;
      notifyListeners();
    }
  });
}

export function useLibrary() {
  const [library, setLibrary] = useState<LibraryItem[]>(globalLibrary);
  const [currentUser, setCurrentUser] = useState<User | null>(
    globalCurrentUser
  );
  const [isLoading, setIsLoading] = useState(isGlobalLoading);

  useEffect(() => {
    const handleUpdate = () => {
      setLibrary(globalLibrary);
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
    return library.some((item) => item.animeId === animeId);
  };

  const toggleSubscription = async (anime: AniListAnime) => {
    const alreadySubscribed = isSubscribed(anime.id);
    let updatedLibrary: LibraryItem[] = [];

    if (alreadySubscribed) {
      updatedLibrary = library.filter((item) => item.animeId !== anime.id);
    } else {
      updatedLibrary = [
        {
          animeId: anime.id,
          animeTitle:
            anime.title.english ||
            anime.title.romaji ||
            anime.title.userPreferred ||
            "Untitled Anime",
          coverImage: anime.coverImage.large || anime.coverImage.medium || "",
          bannerImage: anime.bannerImage || "",
          subscribedAt: new Date().toISOString(),
        },
        ...library,
      ];
    }

    // Optimistically update global and local storage
    globalLibrary = updatedLibrary;
    notifyListeners();
    saveAnimeLibrary(mapToSubscriptionItems(updatedLibrary));

    return !alreadySubscribed;
  };

  return {
    library,
    isLoading,
    isSubscribed,
    toggleSubscription,
    currentUser,
  };
}
