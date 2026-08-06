"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

type CaptureContextValue = {
  isOpen: boolean;
  openCapture: () => void;
  closeCapture: () => void;
};

const CaptureContext =
  createContext<
    CaptureContextValue | null
  >(null);

export function CaptureProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    isOpen,
    setOpen,
  ] =
    useState(false);

  const value =
    useMemo(
      () => ({
        isOpen,

        openCapture() {
          setOpen(true);
        },

        closeCapture() {
          setOpen(false);
        },
      }),
      [isOpen],
    );

  return (
    <CaptureContext.Provider
      value={value}
    >
      {children}
    </CaptureContext.Provider>
  );
}

export function useCapture():
CaptureContextValue {
  const context =
    useContext(
      CaptureContext,
    );

  if (!context) {
    throw new Error(
      "useCapture muss innerhalb des CaptureProvider verwendet werden.",
    );
  }

  return context;
}
