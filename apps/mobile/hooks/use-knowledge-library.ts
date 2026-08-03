import {
  useCallback,
  useState,
} from "react";

import { useFocusEffect } from "@react-navigation/native";

import { getKnowledgeLibrary } from "@/services/content-import-client";
import type { KnowledgeLibrary } from "@savewise/shared";

export function useKnowledgeLibrary() {
  const [library, setLibrary] =
    useState<KnowledgeLibrary | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] = useState<
    string | null
  >(null);

  const loadLibrary =
    useCallback(async () => {
      setError(null);

      try {
        const loadedLibrary =
          await getKnowledgeLibrary();

        setLibrary(loadedLibrary);
      } catch (loadError) {
        setError(
          getErrorMessage(
            loadError,
            "Die Wissensbibliothek konnte nicht geladen werden.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  const refresh =
    useCallback(async () => {
      setError(null);
      setIsRefreshing(true);

      try {
        const refreshedLibrary =
          await getKnowledgeLibrary();

        setLibrary(refreshedLibrary);
      } catch (refreshError) {
        setError(
          getErrorMessage(
            refreshError,
            "Die Wissensbibliothek konnte nicht aktualisiert werden.",
          ),
        );
      } finally {
        setIsRefreshing(false);
        setIsLoading(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLibrary();
    }, [loadLibrary]),
  );

  return {
    library,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}