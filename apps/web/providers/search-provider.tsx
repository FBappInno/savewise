"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

type SearchContextValue = {
  searchQuery: string;
  setSearchQuery:
    (value: string) => void;
  clearSearch: () => void;
};

const SearchContext =
  createContext<
    SearchContextValue | null
  >(null);

export function SearchProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  const value =
    useMemo<
      SearchContextValue
    >(
      () => ({
        searchQuery,
        setSearchQuery,

        clearSearch() {
          setSearchQuery("");
        },
      }),
      [searchQuery],
    );

  return (
    <SearchContext.Provider
      value={value}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useGlobalSearch():
SearchContextValue {
  const context =
    useContext(
      SearchContext,
    );

  if (!context) {
    throw new Error(
      "useGlobalSearch muss innerhalb des SearchProvider verwendet werden.",
    );
  }

  return context;
}
