import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'equipped_watch';

export interface EquippedWatch {
  watchId: string;
  glbFile: string;
  name: string;
}

export async function saveEquippedWatch(watchId: string, glbFile: string, name: string) {
  await AsyncStorage.setItem(KEY, JSON.stringify({ watchId, glbFile, name }));
}

export async function getEquippedWatch(): Promise<EquippedWatch | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearEquippedWatch() {
  await AsyncStorage.removeItem(KEY);
}
