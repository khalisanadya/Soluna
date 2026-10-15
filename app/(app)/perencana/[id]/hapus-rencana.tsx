"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { deletePlan } from "@/app/actions/perencana";
import { dialogClass } from "@/components/session-dialogs";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass } from "@/components/ui";

/** Tombol hapus rencana dengan konfirmasi, agar tidak terhapus karena salah klik. */
export function HapusRencana({ id, nama }: { id: string; nama: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={buttonClass("danger", "md")}>
        <Trash2 className="size-4" /> Hapus
      </button>
      <dialog ref={ref} className={dialogClass} aria-labelledby="judul-hapus-rencana" onClick={(e) => e.target === e.currentTarget && ref.current?.close()}>
        <div className="p-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-flame-50 text-flame-600">
            <Trash2 className="size-5" />
          </span>
          <h2 id="judul-hapus-rencana" className="mt-4 text-xl font-bold tracking-tight text-ink-950">
            Hapus rencana ini?
          </h2>
          <p className="mt-2 text-sm text-ink-600">
            Rencana <span className="font-semibold text-ink-900">{nama}</span> akan dihapus permanen dan tidak dapat dikembalikan.
          </p>
          <form action={deletePlan} className="mt-6 grid grid-cols-2 gap-2">
            <input type="hidden" name="id" value={id} />
            <button type="button" onClick={() => ref.current?.close()} className={buttonClass("secondary", "md")} autoFocus>
              Batal
            </button>
            <SubmitButton variant="danger" pendingText="Menghapus…">
              Ya, hapus
            </SubmitButton>
          </form>
        </div>
      </dialog>
    </>
  );
}
