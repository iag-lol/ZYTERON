"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type AdminUiValue = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
};

const AdminUiContext = createContext<AdminUiValue | null>(null);

export function AdminUiProvider({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <AdminUiContext.Provider
      value={{ mobileNavOpen, setMobileNavOpen, toggleMobileNav: () => setMobileNavOpen((v) => !v) }}
    >
      {children}
    </AdminUiContext.Provider>
  );
}

export function useAdminUi(): AdminUiValue {
  const ctx = useContext(AdminUiContext);
  if (!ctx) {
    return { mobileNavOpen: false, setMobileNavOpen: () => {}, toggleMobileNav: () => {} };
  }
  return ctx;
}
