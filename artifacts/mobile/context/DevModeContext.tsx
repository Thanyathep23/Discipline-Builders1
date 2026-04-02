import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEV_MODE_KEY = "dev_mode_enabled";

interface DevModeValue {
  isDevMode: boolean;
  toggleDevMode: () => void;
}

const DevModeContext = createContext<DevModeValue>({
  isDevMode: false,
  toggleDevMode: () => {},
});

export function useDevMode() {
  return useContext(DevModeContext);
}

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DEV_MODE_KEY).then((val) => {
      if (val === "true") setIsDevMode(true);
    });
  }, []);

  const toggleDevMode = async () => {
    const next = !isDevMode;
    setIsDevMode(next);
    await AsyncStorage.setItem(DEV_MODE_KEY, String(next));
  };

  return (
    <DevModeContext.Provider value={{ isDevMode, toggleDevMode }}>
      {children}
    </DevModeContext.Provider>
  );
}
