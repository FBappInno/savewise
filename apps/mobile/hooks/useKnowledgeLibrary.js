import { useCallback, useEffect, useState } from "react";
import {
  getKnowledgeLibrary,
  rebuildKnowledgeLibrary,
} from "../api/savewiseApi";

export function useKnowledgeLibrary() {
  const [library, setLibrary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [error, setError] = useState(null);

  const loadLibrary = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const result = await getKnowledgeLibrary();
      setLibrary(result);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rebuildLibrary = useCallback(async () => {
    try {
      setError(null);
      setIsRebuilding(true);

      const result = await rebuildKnowledgeLibrary();
      setLibrary(result.library);

      return result.library;
    } catch (rebuildError) {
      setError(rebuildError);
      throw rebuildError;
    } finally {
      setIsRebuilding(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  return {
    library,
    isLoading,
    isRebuilding,
    error,
    reload: loadLibrary,
    rebuild: rebuildLibrary,
  };
}