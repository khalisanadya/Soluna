"use client";

import { useEffect } from "react";

/**
 * Satu observer untuk semua elemen `.reveal` di halaman: elemen muncul halus saat masuk viewport.
 * Kelas `js-reveal` baru dipasang setelah JS berjalan, jadi tanpa JS konten tetap terlihat.
 * Gerak dinonaktifkan lewat CSS bila pengguna memilih prefers-reduced-motion.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const items = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not([data-shown])"));
    // Elemen yang sudah terlihat saat dimuat tidak disembunyikan dulu (hindari kedip).
    const vh = window.innerHeight;
    for (const el of items) if (el.getBoundingClientRect().top < vh * 0.9) el.dataset.shown = "";
    root.classList.add("js-reveal");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.shown = "";
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    for (const el of items) if (!("shown" in el.dataset)) io.observe(el);
    return () => {
      io.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);
  return null;
}
