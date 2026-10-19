"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/ui/Icon";

export default function AppShell({ children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="app-shell">
      <button className="mobile-menu-button" type="button" aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"} onClick={() => setMobileNavOpen((open) => !open)}>
        <Icon name={mobileNavOpen ? "close" : "menu"} />
      </button>
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">P</div>
          <div><strong>Pratyayati</strong><span>Ops</span></div>
        </div>
        <nav aria-label="Primary navigation">
          <Link className="nav-link nav-link-active" href="/" onClick={() => setMobileNavOpen(false)}>
            <Icon name="grid" /> Dashboard
          </Link>
        </nav>
        <div className="sidebar-footer"><span className="online-dot" /> Operations workspace</div>
      </aside>
      {mobileNavOpen && <button className="mobile-overlay" aria-label="Close navigation" type="button" onClick={() => setMobileNavOpen(false)} />}
      <main className="main-content">{children}</main>
    </div>
  );
}
