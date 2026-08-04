import * as SecureStore from "expo-secure-store";

export type DropboxSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  accountId: string;
  displayName: string;
};

const SESSION_KEY = "savewise.storage.dropbox.session.v1";

export async function loadDropboxSession(): Promise<DropboxSession | null> {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as Partial<DropboxSession>;
    return parsed.accessToken && parsed.refreshToken && parsed.expiresAt && parsed.accountId
      ? {
          accessToken: parsed.accessToken,
          refreshToken: parsed.refreshToken,
          expiresAt: parsed.expiresAt,
          accountId: parsed.accountId,
          displayName: parsed.displayName ?? "Dropbox",
        }
      : null;
  } catch {
    return null;
  }
}

export function saveDropboxSession(session: DropboxSession): Promise<void> {
  return SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export function deleteDropboxSession(): Promise<void> {
  return SecureStore.deleteItemAsync(SESSION_KEY);
}
