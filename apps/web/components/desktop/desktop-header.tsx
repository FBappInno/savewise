"use client";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  WorkspaceSwitcher,
} from "@/components/desktop/workspace-switcher";

import {
  useAccount,
} from "@/providers/account-provider";

import {
  useCapture,
} from "@/providers/capture-provider";

const pageInformation = {
  "/universe": {
    eyebrow:
      "WISSENSNETZWERK",

    title:
      "Universum",

    description:
      "Deine Inhalte, Domänen und Verbindungen.",
  },

  "/knowledge": {
    eyebrow:
      "PERSONAL INTELLIGENCE",

    title:
      "Wissen",

    description:
      "Analysiere Muster und entwickle neue Erkenntnisse.",
  },

  "/research": {
    eyebrow:
      "AUTONOMOUS RESEARCH",

    title:
      "Research",

    description:
      "Entdecke Quellen, Trends und Wissenslücken.",
  },

  "/settings": {
    eyebrow:
      "SAVEWISE CORE",

    title:
      "Einstellungen",

    description:
      "Konto, Cloud und Systemkonfiguration.",
  },
} as const;

export function DesktopHeader() {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const {
    account,
    logout,
  } =
    useAccount();

  const {
    openCapture,
  } =
    useCapture();

  const information =
    Object.entries(
      pageInformation,
    ).find(
      ([path]) =>
        pathname.startsWith(
          path,
        ),
    )?.[1] ??
    pageInformation[
      "/universe"
    ];

  const initials =
    account?.username
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part: string) =>
          part[0]
            ?.toUpperCase(),
      )
      .join("") ||
    "SW";

  function handleLogout() {
    logout();

    router.replace(
      "/login",
    );
  }

  return (
    <header className="desktop-header">
      <div>
        <div className="page-eyebrow">
          {information.eyebrow}
        </div>

        <h1 className="page-title">
          {information.title}
        </h1>

        <p className="page-description">
          {information.description}
        </p>
      </div>

      <div className="header-actions">
        <WorkspaceSwitcher />

        <button
          className="capture-button"
          onClick={
            openCapture
          }
          type="button"
        >
          <span>
            +
          </span>

          Erfassen
        </button>

        <div className="account-menu">
          <div className="account-avatar">
            {initials}
          </div>

          <div className="account-menu-content">
            <div className="account-name">
              {account?.username ??
                "SaveWise"}
            </div>

            <div className="account-status">
              Angemeldet
            </div>
          </div>

          <button
            aria-label="Abmelden"
            className="logout-button"
            onClick={
              handleLogout
            }
            title="Abmelden"
            type="button"
          >
            ↪
          </button>
        </div>
      </div>
    </header>
  );
}
