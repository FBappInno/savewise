import {
  useCallback,
  useState,
} from "react";

import { useFocusEffect } from "@react-navigation/native";

import { hybridDiscoveryRepository } from "@/repositories/hybrid-discovery-repository";
import type { Discovery } from "@/types/discovery";

import type {
  WorkspaceId,
} from "@/types/app-settings";

export function useDiscoveries() {
  const [
    discoveries,
    setDiscoveries,
  ] = useState<Discovery[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    isImporting,
    setIsImporting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const loadDiscoveries =
    useCallback(async () => {
      setError(null);
      setIsLoading(true);

      try {
        const localDiscoveries =
          await hybridDiscoveryRepository.getAll();

        setDiscoveries(
          localDiscoveries,
        );
      } catch (loadError) {
        setError(
          getErrorMessage(
            loadError,
            "Discoveries konnten nicht lokal geladen werden.",
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
        const refreshedDiscoveries =
          await hybridDiscoveryRepository.refresh();

        setDiscoveries(
          refreshedDiscoveries,
        );
      } catch (refreshError) {
        setError(
          getErrorMessage(
            refreshError,
            "Discoveries konnten nicht aktualisiert werden.",
          ),
        );
      } finally {
        setIsRefreshing(false);
        setIsLoading(false);
      }
    }, []);

  const importDiscovery =
    useCallback(
      async (
        url: string,
        preferredKnowledgePath?: string[],
        workspaceId: WorkspaceId = "private",
      ): Promise<Discovery> => {
        setError(null);
        setIsImporting(true);

        try {
          const discovery =
            await hybridDiscoveryRepository.importFromUrl(
              url,
              preferredKnowledgePath,
              workspaceId,
            );

          setDiscoveries(
            (currentDiscoveries) =>
              sortDiscoveries([
                discovery,

                ...currentDiscoveries.filter(
                  (currentDiscovery) =>
                    currentDiscovery.id !==
                    discovery.id,
                ),
              ]),
          );

          return discovery;
        } catch (importError) {
          const message =
            getErrorMessage(
              importError,
              "Der Inhalt konnte nicht importiert werden.",
            );

          setError(message);

          throw new Error(message);
        } finally {
          setIsImporting(false);
        }
      },
      [],
    );

  const removeDiscovery =
    useCallback(
      async (
        discoveryId: string,
      ): Promise<void> => {
        setError(null);

        const previousDiscoveries =
          discoveries;

        setDiscoveries(
          (currentDiscoveries) =>
            currentDiscoveries.filter(
              (discovery) =>
                discovery.id !==
                discoveryId,
            ),
        );

        try {
          await hybridDiscoveryRepository.delete(
            discoveryId,
          );
        } catch (deleteError) {
          setDiscoveries(
            previousDiscoveries,
          );

          const message =
            getErrorMessage(
              deleteError,
              "Die Discovery konnte nicht gelöscht werden.",
            );

          setError(message);

          throw new Error(message);
        }
      },
      [discoveries],
    );

  useFocusEffect(
    useCallback(() => {
      void loadDiscoveries();
    }, [loadDiscoveries]),
  );

  return {
    discoveries,
    isLoading,
    isRefreshing,
    isImporting,
    error,
    refresh,
    importDiscovery,
    removeDiscovery,
  };
}

function sortDiscoveries(
  discoveries: Discovery[],
): Discovery[] {
  return [
    ...discoveries,
  ].sort(
    (first, second) =>
      new Date(
        second.createdAt,
      ).getTime() -
      new Date(
        first.createdAt,
      ).getTime(),
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}
