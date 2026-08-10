import type {
  GalaxyCandidatePreview,
} from "@/services/discovery-client";

export function GalaxyCandidateSelector({
  candidates,
  disabled,
  isLoading,
  onLoad,
  onSelect,
  selectedGalaxy,
}: {
  candidates:
    GalaxyCandidatePreview[];
  disabled: boolean;
  isLoading: boolean;
  onLoad: () => void;
  onSelect: (
    galaxy: string | null,
  ) => void;
  selectedGalaxy:
    string | null;
}) {
  return (
    <section className="galaxy-candidate-selector">
      <div className="galaxy-candidate-header">
        <div>
          <small>
            CLASSIFICATION V3
          </small>

          <strong>
            Galaxie festlegen
          </strong>

          <p>
            SaveWise schlägt passende
            bestehende Galaxien vor.
          </p>
        </div>

        <button
          className="galaxy-candidate-load"
          disabled={
            disabled || isLoading
          }
          onClick={onLoad}
          type="button"
        >
          {isLoading
            ? "Prüfe …"
            : "✦ Mit KI prüfen"}
        </button>
      </div>

      <button
        className={
          selectedGalaxy === null
            ? "galaxy-candidate-option galaxy-candidate-option-active"
            : "galaxy-candidate-option"
        }
        disabled={
          disabled || isLoading
        }
        onClick={() => {
          onSelect(null);
        }}
        type="button"
      >
        <span>
          {selectedGalaxy === null
            ? "●"
            : "○"}
        </span>

        <span>
          <strong>
            Galaxie automatisch bestimmen
          </strong>

          <small>
            KI entscheidet anhand des Inhalts.
          </small>
        </span>
      </button>

      {candidates.map(
        (candidate, index) => {
          const active =
            selectedGalaxy ===
            candidate.galaxy;

          return (
            <button
              className={
                active
                  ? "galaxy-candidate-option galaxy-candidate-option-active"
                  : "galaxy-candidate-option"
              }
              disabled={
                disabled || isLoading
              }
              key={candidate.galaxy}
              onClick={() => {
                onSelect(
                  candidate.galaxy,
                );
              }}
              type="button"
            >
              <span>
                {active
                  ? "●"
                  : "○"}
              </span>

              <span>
                <strong>
                  {candidate.galaxy}
                </strong>

                <small>
                  Vorschlag {index + 1} ·{" "}
                  {Math.round(
                    candidate.score * 100,
                  )}
                  %
                </small>
              </span>
            </button>
          );
        },
      )}
    </section>
  );
}
