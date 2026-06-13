import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { storage } from "../utils";

export interface AppSettings {
  playback: {
    defaultServer: string;
    defaultAudio: "Japanese" | "English Dub" | "Auto";
    defaultSubtitle: "English" | "None" | "Auto";
    autoPlayNext: boolean;
    autoResume: boolean;
    skipIntro: boolean;
    skipOutro: boolean;
  };
  videoQuality: {
    preferredQuality: "Auto" | "1080p" | "720p" | "480p";
    dataSaver: boolean;
    preloadNext: boolean;
  };
  homepage: {
    enableHero: boolean;
    enableContinueWatching: boolean;
    enableRecentlyAdded: boolean;
    enableTrending: boolean;
  };
  appearance: {
    theme: "Dark" | "System";
    reduceAnimations: boolean;
  };
  notifications: {
    newEpisodes: boolean;
    continueWatching: boolean;
  };
}

export const defaultSettings: AppSettings = {
  playback: {
    defaultServer: "animegg",
    defaultAudio: "Auto",
    defaultSubtitle: "Auto",
    autoPlayNext: true,
    autoResume: true,
    skipIntro: false,
    skipOutro: false
  },
  videoQuality: {
    preferredQuality: "Auto",
    dataSaver: false,
    preloadNext: true
  },
  homepage: {
    enableHero: true,
    enableContinueWatching: true,
    enableRecentlyAdded: true,
    enableTrending: true
  },
  appearance: {
    theme: "Dark",
    reduceAnimations: false
  },
  notifications: {
    newEpisodes: true,
    continueWatching: true
  }
};

let globalSettings: AppSettings = { ...defaultSettings };
const savedLocal = storage.get<Partial<AppSettings> | null>("miyoro_settings", null);
if (savedLocal) {
    try {
        globalSettings = { ...defaultSettings, ...(savedLocal as any) };
    } catch(e) {}
}

let globalCurrentUser: User | null = null;
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

if (auth) {
  onAuthStateChanged(auth, async (user) => {
    globalCurrentUser = user;
    if (user) {
      notifyListeners();
      try {
        if (db) {
          const settingsRef = doc(db, "settings", user.uid);
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            globalSettings = { ...defaultSettings, ...settingsSnap.data() };
            storage.set("miyoro_settings", globalSettings);
          } else {
            // Push defaults to db if completely new
            await setDoc(settingsRef, globalSettings, { merge: true });
          }
        }
      } catch (err) {
        // Silently ignore
      } finally {
        notifyListeners();
      }
    } else {
      notifyListeners();
    }
  });
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(globalSettings);

  useEffect(() => {
    const handleUpdate = () => {
      setSettingsState(globalSettings);
    };
    listeners.add(handleUpdate);
    handleUpdate();
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const updateSettings = async (newSettingsPartial: Partial<AppSettings>) => {
    const newSettings = { ...globalSettings, ...newSettingsPartial };
    
    // Check nested partials specifically
    if (newSettingsPartial.playback) newSettings.playback = { ...globalSettings.playback, ...newSettingsPartial.playback };
    if (newSettingsPartial.videoQuality) newSettings.videoQuality = { ...globalSettings.videoQuality, ...newSettingsPartial.videoQuality };
    if (newSettingsPartial.homepage) newSettings.homepage = { ...globalSettings.homepage, ...newSettingsPartial.homepage };
    if (newSettingsPartial.appearance) newSettings.appearance = { ...globalSettings.appearance, ...newSettingsPartial.appearance };
    if (newSettingsPartial.notifications) newSettings.notifications = { ...globalSettings.notifications, ...newSettingsPartial.notifications };
    
    globalSettings = newSettings;
    storage.set("miyoro_settings", globalSettings);
    notifyListeners();

    if (globalCurrentUser && db) {
      try {
        const settingsRef = doc(db, "settings", globalCurrentUser.uid);
        await setDoc(settingsRef, newSettings, { merge: true });
      } catch (err) {
        // Silently ignore
      }
    }
  };

  const resetSettings = async () => {
    globalSettings = { ...defaultSettings };
    storage.set("miyoro_settings", globalSettings);
    notifyListeners();

    if (globalCurrentUser && db) {
      try {
        const settingsRef = doc(db, "settings", globalCurrentUser.uid);
        await setDoc(settingsRef, globalSettings, { merge: false });
      } catch (err) {
        // Silently ignore
      }
    }
  };

  return {
    settings,
    updateSettings,
    resetSettings
  };
}
