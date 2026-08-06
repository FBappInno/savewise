import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "savewise.account.session.v1";
const LOGIN_REQUIRED_KEY = "savewise.account.login-required.v1";

export type AccountProfile = { username: string; email: string };

export async function requestAccountVerification(input: {
  username: string;
  email: string;
  oldPassword?: string;
  newPassword: string;
}): Promise<{ developmentVerificationUrl?: string }> {
  return accountRequest("/api/account/request-verification", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function loginAccount(email: string, password: string): Promise<AccountProfile> {
  const result = await accountRequest<{ token: string; account: AccountProfile }>("/api/account/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await SecureStore.setItemAsync(SESSION_KEY, result.token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await AsyncStorage.removeItem(LOGIN_REQUIRED_KEY);
  return result.account;
}

export async function logoutAccount(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(
      SESSION_KEY,
    ),

    AsyncStorage.setItem(
      LOGIN_REQUIRED_KEY,
      "true",
    ),
  ]);
}

export async function getStoredAccountSessionToken(): Promise<string | null> {
  return SecureStore.getItemAsync(
    SESSION_KEY,
  );
}

export async function hasStoredAccountSession(): Promise<boolean> {
  return Boolean(
    await SecureStore.getItemAsync(
      SESSION_KEY,
    ),
  );
}

export async function hasVerifiedAccountSession(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(SESSION_KEY);
  if (!token) return false;
  try {
    await accountRequest("/api/account/session", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return true;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return false;
  }
}

export function markLoginRequired(): Promise<void> {
  return Promise.all([
    AsyncStorage.setItem(LOGIN_REQUIRED_KEY, "true"),
    SecureStore.deleteItemAsync(SESSION_KEY),
  ]).then(() => undefined);
}

export async function isLoginRequired(): Promise<boolean> {
  return (await AsyncStorage.getItem(LOGIN_REQUIRED_KEY)) === "true";
}

async function accountRequest<T = void>(path: string, options: RequestInit): Promise<T> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) throw new Error("EXPO_PUBLIC_API_URL ist nicht konfiguriert.");
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}${path}`, {
    ...options,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...options.headers },
  });
  const body = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(body.error ?? `ACCOUNT_HTTP_${response.status}`);
  return body;
}
