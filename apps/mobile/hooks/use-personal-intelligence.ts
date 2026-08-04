import { useCallback, useEffect, useState } from "react";

import {
  createPersonalWorkProduct,
  getPersonalIntelligenceOverview,
} from "@/services/content-import-client";
import type {
  PersonalIntelligenceOverview,
  WorkAssistantRequest,
  WorkAssistantResult,
} from "@savewise/shared";

export function usePersonalIntelligence() {
  const [overview, setOverview] = useState<PersonalIntelligenceOverview | null>(null);
  const [workProduct, setWorkProduct] = useState<WorkAssistantResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      setOverview(await getPersonalIntelligenceOverview());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createWorkProduct = useCallback(async (request: WorkAssistantRequest) => {
    setError(null);
    setIsWorking(true);
    try {
      setWorkProduct(await createPersonalWorkProduct(request));
    } catch (workError) {
      setError(getErrorMessage(workError));
    } finally {
      setIsWorking(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { overview, workProduct, isLoading, isWorking, error, load, createWorkProduct };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Die Personal Intelligence Platform ist momentan nicht verfügbar.";
}
