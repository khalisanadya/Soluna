import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Data Baterai" };

/** Rute lama dipertahankan agar bookmark lama langsung menuju sumber data baterai. */
export default async function PenilaianLegacyPage() {
  redirect("/baterai");
}
