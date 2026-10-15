"use client";

import { useLayoutEffect } from "react";

/* Mengunci gulir halaman selama komponen ini terlihat (lihat globals.css).
   Dengan Cache Components, halaman yang ditinggalkan tetap ada di DOM (disembunyikan <Activity>),
   jadi penanda di DOM tidak cukup — efek ini dibersihkan saat halaman disembunyikan. */
export function LayarTetap() {
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-layar-tetap", "");
    return () => document.documentElement.removeAttribute("data-layar-tetap");
  }, []);
  return null;
}
