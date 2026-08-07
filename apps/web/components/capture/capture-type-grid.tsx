"use client";

import type {
  CaptureOption,
  CaptureType,
} from "@/types/capture";

const options:
CaptureOption[] = [
  {
    type:
      "link",

    title:
      "Link speichern",

    description:
      "Webseiten, Videos, Beiträge und Online-Quellen analysieren.",

    icon:
      "↗",

    available:
      true,
  },

  {
    type:
      "note",

    title:
      "Schnellnotiz",

    description:
      "Gedanken, Ideen und Beobachtungen sofort festhalten.",

    icon:
      "✎",

    available:
      true,
  },

  {
    type:
      "pdf",

    title:
      "PDF importieren",

    description:
      "Dokumente analysieren und mit deinem Wissen verbinden.",

    icon:
      "▤",

    available:
      true,
  },

  {
    type:
      "image",

    title:
      "Bild importieren",

    description:
      "Fotos, Screenshots und Whiteboards erfassen.",

    icon:
      "▧",

    available:
      true,
  },

  {
    type:
      "audio",

    title:
      "Sprache aufnehmen",

    description:
      "Gedanken einsprechen und automatisch strukturieren.",

    icon:
      "◉",

    available:
      false,
  },
];

export function CaptureTypeGrid({
  onSelect,
}: {
  onSelect:
    (type: CaptureType) => void;
}) {
  return (
    <div className="capture-type-grid">
      {options.map(
        (option) => (
          <button
            className={
              option.available
                ? "capture-type-card"
                : "capture-type-card capture-type-card-disabled"
            }
            disabled={
              !option.available
            }
            key={
              option.type
            }
            onClick={() => {
              onSelect(
                option.type,
              );
            }}
            type="button"
          >
            <span className="capture-type-icon">
              {option.icon}
            </span>

            <span className="capture-type-content">
              <strong>
                {option.title}
              </strong>

              <span>
                {option.description}
              </span>
            </span>

            {!option.available ? (
              <span className="capture-coming-soon">
                Bald
              </span>
            ) : (
              <span className="capture-arrow">
                →
              </span>
            )}
          </button>
        ),
      )}
    </div>
  );
}
