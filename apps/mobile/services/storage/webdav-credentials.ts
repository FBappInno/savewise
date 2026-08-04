import * as SecureStore from "expo-secure-store";

export type WebDavCredentials = {
  serverUrl: string;
  username: string;
  password: string;
};

const CREDENTIALS_KEY = "savewise.storage.webdav.credentials.v1";

export async function loadWebDavCredentials(): Promise<WebDavCredentials | null> {
  const stored = await SecureStore.getItemAsync(CREDENTIALS_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as Partial<WebDavCredentials>;
    return parsed.serverUrl && parsed.username && parsed.password
      ? {
          serverUrl: parsed.serverUrl,
          username: parsed.username,
          password: parsed.password,
        }
      : null;
  } catch {
    return null;
  }
}

export async function saveWebDavCredentials(
  credentials: WebDavCredentials,
): Promise<void> {
  await SecureStore.setItemAsync(
    CREDENTIALS_KEY,
    JSON.stringify(credentials),
    { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
  );
}

export function deleteWebDavCredentials(): Promise<void> {
  return SecureStore.deleteItemAsync(CREDENTIALS_KEY);
}
