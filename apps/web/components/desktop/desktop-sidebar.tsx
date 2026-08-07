"use client";

import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  useCapture,
} from "@/providers/capture-provider";

import {
  useGlobalSearch,
} from "@/providers/search-provider";

const navigation = [
  {
    href: "/universe",
    icon: "◎",
    label: "Universum",
  },
  {
    href: "/knowledge",
    icon: "◇",
    label: "Wissen",
  },
  {
    href: "/research",
    icon: "⌁",
    label: "Research",
  },
  {
    href: "/settings",
    icon: "⚙",
    label: "Einstellungen",
  },
] as const;

export function DesktopSidebar() {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const {
    openCapture,
  } =
    useCapture();

  const {
    searchQuery,
    setSearchQuery,
    clearSearch,
  } =
    useGlobalSearch();

  function handleSearchChange(
    value: string,
  ) {
    setSearchQuery(value);

    if (
      value.trim() &&
      !pathname.startsWith(
        "/universe",
      )
    ) {
      router.push(
        "/universe?view=discoveries",
      );
    }
  }

  return (
    <aside className="desktop-sidebar">
      <div className="brand-area">
        <div className="brand-mark">
          S
        </div>

        <div>
          <div className="brand-name">
            SaveWise
          </div>

          <div className="brand-caption">
            Personal Intelligence
          </div>
        </div>
      </div>

      <button
        className="sidebar-capture-button"
        onClick={
          openCapture
        }
        type="button"
      >
        <span>
          +
        </span>

        Neues Wissen erfassen
      </button>

      <label className="sidebar-search">
        <span className="sidebar-search-icon">
          ⌕
        </span>

        <input
          onChange={(event) => {
            handleSearchChange(
              event.target.value,
            );
          }}
          placeholder="Wissen durchsuchen …"
          type="search"
          value={searchQuery}
        />

        {searchQuery ? (
          <button
            aria-label="Suche löschen"
            onClick={
              clearSearch
            }
            type="button"
          >
            ×
          </button>
        ) : null}
      </label>

      <div className="sidebar-navigation-label">
        WORKSPACE
      </div>

      <nav className="desktop-navigation">
        {navigation.map(
          (item) => {
            const active =
              pathname.startsWith(
                item.href,
              );

            return (
              <Link
                className={
                  active
                    ? "navigation-item navigation-item-active"
                    : "navigation-item"
                }
                href={item.href}
                key={item.href}
              >
                <span className="navigation-icon">
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>
              </Link>
            );
          },
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-version">
          SaveWise Workspace
        </div>

        <div className="sidebar-environment">
          Railway verbunden
        </div>
      </div>
    </aside>
  );
}
