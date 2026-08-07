"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  deleteStoredAccountSession,
  loadStoredAccountSession,
  loginAccount,
  validateAccountSession,
} from "@/services/account-client";

import type {
  AccountStatus,
  AccountSummary,
} from "@/types/account";

type AccountContextValue = {
  account: AccountSummary | null;

  status: AccountStatus;

  error: string | null;

  login: (
    email: string,
    password: string,
  ) => Promise<void>;

  logout: () => void;

  refreshSession:
    () => Promise<boolean>;
};

const AccountContext =
  createContext<
    AccountContextValue | null
  >(null);

export function AccountProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    account,
    setAccount,
  ] =
    useState<
      AccountSummary | null
    >(null);

  const [
    status,
    setStatus,
  ] =
    useState<AccountStatus>(
      "loading",
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const refreshSession =
    useCallback(
      async (): Promise<boolean> => {
        const stored =
          loadStoredAccountSession();

        if (!stored) {
          setAccount(null);
          setStatus(
            "anonymous",
          );

          return false;
        }

        try {
          const verifiedAccount =
            await validateAccountSession(
              stored.token,
            );

          if (!verifiedAccount) {
            deleteStoredAccountSession();

            setAccount(null);
            setStatus(
              "anonymous",
            );

            return false;
          }

          setAccount(
            verifiedAccount,
          );

          setStatus(
            "authenticated",
          );

          return true;
        } catch {
          /*
           * Bei einem vorübergehenden
           * Netzwerkfehler behalten wir
           * die gespeicherte Sitzung.
           */
          setAccount(
            stored.account,
          );

          setStatus(
            "authenticated",
          );

          return true;
        }
      },
      [],
    );

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  async function login(
    email: string,
    password: string,
  ): Promise<void> {
    setError(null);
    setStatus(
      "loading",
    );

    try {
      const session =
        await loginAccount(
          email,
          password,
        );

      setAccount(
        session.account,
      );

      setStatus(
        "authenticated",
      );
    } catch (loginError) {
      setAccount(null);
      setStatus(
        "anonymous",
      );

      const message =
        loginError instanceof Error
          ? loginError.message
          : "Die Anmeldung ist fehlgeschlagen.";

      setError(message);

      throw loginError;
    }
  }

  function logout(): void {
    deleteStoredAccountSession();

    setAccount(null);
    setError(null);
    setStatus(
      "anonymous",
    );
  }

  const value =
    useMemo<
      AccountContextValue
    >(
      () => ({
        account,
        status,
        error,
        login,
        logout,
        refreshSession,
      }),
      [
        account,
        status,
        error,
        refreshSession,
      ],
    );

  return (
    <AccountContext.Provider
      value={value}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount():
AccountContextValue {
  const context =
    useContext(
      AccountContext,
    );

  if (!context) {
    throw new Error(
      "useAccount muss innerhalb des AccountProvider verwendet werden.",
    );
  }

  return context;
}
