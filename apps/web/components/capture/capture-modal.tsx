"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CaptureTypeGrid,
} from "@/components/capture/capture-type-grid";

import {
  LinkCaptureForm,
} from "@/components/capture/link-capture-form";

import {
  QuickNoteForm,
} from "@/components/capture/quick-note-form";

import {
  useCapture,
} from "@/providers/capture-provider";

import type {
  CaptureType,
} from "@/types/capture";

export function CaptureModal() {
  const {
    isOpen,
    closeCapture,
  } =
    useCapture();

  const [
    selectedType,
    setSelectedType,
  ] =
    useState<
      CaptureType | null
    >(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        closeCapture();
      }
    }

    if (isOpen) {
      window.addEventListener(
        "keydown",
        handleKeyDown,
      );
    }

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    closeCapture,
    isOpen,
  ]);

  if (!isOpen) {
    return null;
  }

  function handleComplete() {
    closeCapture();
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={
        closeCapture
      }
    >
      <section
        aria-modal="true"
        className="capture-modal"
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        role="dialog"
      >
        <header className="capture-modal-header">
          <div>
            <div className="page-eyebrow">
              NEUES WISSEN
            </div>

            <h2>
              Erfassen
            </h2>

            {!selectedType ? (
              <p>
                Was möchtest du deinem
                Wissensuniversum hinzufügen?
              </p>
            ) : null}
          </div>

          <button
            aria-label="Dialog schließen"
            className="modal-close-button"
            onClick={
              closeCapture
            }
            type="button"
          >
            ×
          </button>
        </header>

        {!selectedType ? (
          <CaptureTypeGrid
            onSelect={
              setSelectedType
            }
          />
        ) : null}

        {selectedType ===
        "note" ? (
          <QuickNoteForm
            onBack={() => {
              setSelectedType(
                null,
              );
            }}
            onComplete={
              handleComplete
            }
          />
        ) : null}

        {selectedType ===
        "link" ? (
          <LinkCaptureForm
            onBack={() => {
              setSelectedType(
                null,
              );
            }}
            onComplete={
              handleComplete
            }
          />
        ) : null}
      </section>
    </div>
  );
}
