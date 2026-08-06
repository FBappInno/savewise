"use client";

import Link from "next/link";
import {
  usePathname,
} from "next/navigation";

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
          SaveWise Desktop
        </div>

        <div className="sidebar-environment">
          Railway verbunden
        </div>
      </div>
    </aside>
  );
}
