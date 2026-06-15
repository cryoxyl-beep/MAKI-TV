import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AniListAnime } from "../types";
import { storage } from "../utils";

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

// Initialize auth listener just once
if (auth) {
  onAuthStateChanged(auth, async (user) => {
    globalCurrentUser = user;
    if (user) {
      isGlobalLoading = true;
      notifyListeners();
      try {
        if (db) {
          const libRef = doc(db, "libraries", user.uid);
          const libSnap = await getDoc(libRef);
          if (libSnap.exists()) {
            globalLibrary = libSnap.data().animes || [];
          } else {
            globalLibrary = [];
          }

          // Sync local storage history/watch later
          const userRef = doc(db, "userData", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
             const data = userSnap.data();
             if (data.history) storage.set("history", data.history);
             if (data.watch_later) storage.set("watch_later", data.watch_later);
             if (data.movie_history) storage.set("movie_history", data.movie_history);
             if (data.series_history) storage.set("series_history", data.series_history);
             if (data.unified_watch_states) storage.set("unified_watch_states", data.unified_watch_states);
          }
        }
      } catch (err) {
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
  const [currentUser, setCurrentUser] = useState<User | null>(globalCurrentUser);
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
    if (!globalCurrentUser || !db) return false;

    const alreadySubscribed = isSubscribed(anime.id);
    let updatedLibrary: LibraryItem[] = [];

    if (alreadySubscribed) {
      updatedLibrary = library.filter((item) => item.animeId !== anime.id);
    } else {
      updatedLibrary = [
        {
          animeId: anime.id,
          animeTitle: anime.title.english || anime.title.romaji || anime.title.userPreferred || "Untitled Anime",
          coverImage: anime.coverImage.large || anime.coverImage.medium || "",
          bannerImage: anime.bannerImage || "",
          subscribedAt: new Date().toISOString(),
        },
        ...library,
      ];
    }

    // Optimistically update global state
    globalLibrary = updatedLibrary;
    notifyListeners();

    try {
      const docRef = doc(db, "libraries", globalCurrentUser.uid);
      await setDoc(docRef, { animes: updatedLibrary }, { merge: true });
    } catch (err) {
      // Revert if failed
      globalLibrary = library;
      notifyListeners();
      return alreadySubscribed;
    }

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
