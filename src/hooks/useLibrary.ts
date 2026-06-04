import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AniListAnime, WatchHistoryItem } from "../types";
import { storage, WatchLaterItem } from "../utils";

export interface LibraryItem {
  animeId: number;
  animeTitle: string;
  coverImage: string;
  bannerImage?: string;
  subscribedAt: string;
}

export function useLibrary() {
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user.uid);
      } else {
        setLibrary([]);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserData = async (uid: string) => {
    setIsLoading(true);
    try {
      if (!db) return;
      
      // Fetch Library (Subscriptions)
      const libRef = doc(db, "libraries", uid);
      const libSnap = await getDoc(libRef);
      if (libSnap.exists()) {
        const data = libSnap.data();
        setLibrary(data.animes || []);
      } else {
        setLibrary([]);
      }

      // Fetch other user data (history, watch_later) to keep sync with local storage
      const userRef = doc(db, "userData", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
         const data = userSnap.data();
         if (data.history) storage.set("history", data.history);
         if (data.watch_later) storage.set("watch_later", data.watch_later);
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isSubscribed = (animeId: number) => {
    return library.some((item) => item.animeId === animeId);
  };

  const toggleSubscription = async (anime: AniListAnime) => {
    if (!currentUser) return false;
    if (!db) return false;

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

    setLibrary(updatedLibrary);
    try {
      const docRef = doc(db, "libraries", currentUser.uid);
      await setDoc(docRef, { animes: updatedLibrary }, { merge: true });
    } catch (err) {
      console.error("Failed to update library:", err);
      // Revert if failed
      setLibrary(library);
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
