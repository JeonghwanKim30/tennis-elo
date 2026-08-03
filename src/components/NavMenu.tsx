"use client";

import { useState } from "react";

export function NavMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        className="flex h-9 w-9 items-center justify-center rounded border text-lg leading-none sm:hidden"
      >
        {open ? "×" : "☰"}
      </button>
      <div
        className={`${open ? "flex" : "hidden"} mt-3 w-full flex-col items-start gap-3 text-sm sm:mt-0 sm:flex sm:w-auto sm:flex-row sm:items-center sm:gap-4`}
      >
        {children}
      </div>
    </>
  );
}
