import {
  useCallback,
  useState,
} from "react";

import { useFocusEffect } from "@react-navigation/native";

import { hybridKnowledgeRepository } from "@/repositories/hybrid-knowledge-repository";
import type {
  KnowledgeLibrary,
} from "@savewise/shared";

export function useKnowledgeLibrary() {
  const [
    library,
    setLibrary,
  ] =
    useState<KnowledgeLibrary | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const loadLibrary =
    useCallback(async () => {
      setError(null);
      setIsLoading(true);

      try {
        const localLibrary =
          await hybridKnowledgeRepository.getLibrary();

        if (localLibrary) {
          setLibrary(
            localLibrary,
          );

          return;
        }

        try {
          const refreshedLibrary =
            await hybridKnowledgeRepository.refresh();

          setLibrary(
            refreshedLibrary,
          );
        } catch {
          setLibrary(null);
        }
      } catch (loadError) {
        setError(
          getErrorMessage(
            loadError,
            "Die Wissensbibliothek konnte nicht lokal geladen werden.",
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
          await hybridKnowledgeRepository.refresh();

        setLibrary(
          refreshedLibrary,
        );
      } catch (refreshError) {
        const localLibrary =
          await hybridKnowledgeRepository.getLibrary();

        if (localLibrary) {
          setLibrary(
            localLibrary,
          );

          setError(null);
        } else {
          setError(
            getErrorMessage(
              refreshError,
              "Die Wissensbibliothek konnte nicht aktualisiert werden.",
            ),
          );
        }
      } finally {
        setIsRefreshing(false);
        setIsLoading(false);
      }
    }, []);

  const rebuild =
    useCallback(async () => {
      setError(null);
      setIsRefreshing(true);

      try {
        const rebuiltLibrary =
          await hybridKnowledgeRepository.rebuild();

        setLibrary(
          rebuiltLibrary,
        );

        return rebuiltLibrary;
      } catch (rebuildError) {
        const message =
          getErrorMessage(
            rebuildError,
            "Die Wissensbibliothek konnte nicht neu aufgebaut werden.",
          );

        setError(message);

        throw new Error(message);
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
    rebuild,
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