"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  DEFAULT_WEB_SETTINGS,
  loadWebSettings,
  saveWebSettings,
  WEB_SETTINGS_EVENT,
  type WebSettings,
} from "@/services/web-settings";

export function useWebSettings() {
  const [
    settings,
    setSettings,
  ] =
    useState<WebSettings>(
      DEFAULT_WEB_SETTINGS,
    );

  const [
    isLoaded,
    setLoaded,
  ] =
    useState(false);

  useEffect(() => {
    setSettings(
      loadWebSettings(),
    );

    setLoaded(true);

    function handleChange(
      event:
        Event,
    ) {
      const customEvent =
        event as
          CustomEvent<
            WebSettings
          >;

      setSettings(
        customEvent.detail ??
        loadWebSettings(),
      );
    }

    window.addEventListener(
      WEB_SETTINGS_EVENT,
      handleChange,
    );

    return () => {
      window.removeEventListener(
        WEB_SETTINGS_EVENT,
        handleChange,
      );
    };
  }, []);

  const updateSettings =
    useCallback(
      (
        updater:
          | WebSettings
          | ((
              current:
                WebSettings,
            ) =>
              WebSettings),
      ) => {
        setSettings(
          (current) => {
            const updated =
              typeof updater ===
              "function"
                ? updater(
                    current,
                  )
                : updater;

            saveWebSettings(
              updated,
            );

            return updated;
          },
        );
      },
      [],
    );

  return {
    settings,
    isLoaded,
    updateSettings,
  };
}
