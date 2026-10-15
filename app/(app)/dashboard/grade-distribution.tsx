import Link from "next/link";
import { Donut } from "@/components/charts";
import { Card, GradeBadge, SectionTitle, gradeTone } from "@/components/ui";
import { cn } from "@/lib/format";
import type { Grade } from "@/lib/types";

const GRADES: Grade[] = ["A", "B", "C", "D"];

export function GradeDistribution({ counts }: { counts: Record<Grade | "belum", number> }) {
  const dinilai = counts.A + counts.B + counts.C + counts.D;
  const total = dinilai + counts.belum;
  const persen = (n: number, dari: number) => (dari ? Math.round((n / dari) * 100) : 0);

  return (
    <Card className="flex flex-col">
      <SectionTitle title="Distribusi grade" hint="Kondisi baterai yang sudah dinilai" />

      <div className="flex justify-center py-2">
        <Donut
          size={184}
          thickness={18}
          label="Distribusi grade baterai"
          segments={GRADES.map((g) => ({ label: `Grade ${g} (${gradeTone[g].label})`, value: counts[g], color: gradeTone[g].hex }))}
          center={
            <div>
              <p className="num text-[2rem] leading-none font-semibold text-ink-950">{dinilai}</p>
              <p className="mt-1.5 text-xs text-ink-500">dari {total} dinilai</p>
            </div>
          }
        />
      </div>

      <ul className="mt-4 space-y-1">
        {GRADES.map((g) => (
          <li key={g}>
            <Link href={`/baterai?grade=${g}`} className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-ink-50" title={`Lihat baterai grade ${g}`}>
              <GradeBadge grade={g} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-ink-700">{gradeTone[g].label}</span>
                  <span className="num font-medium text-ink-900">
                    {counts[g]}
                    <span className="ml-1.5 text-xs font-normal text-ink-400">{persen(counts[g], dinilai)}%</span>
                  </span>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <span className={cn("block h-full rounded-full", gradeTone[g].bg)} style={{ width: `${persen(counts[g], dinilai)}%` }} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/baterai?status=BELUM_DINILAI"
        className="mt-auto flex items-center gap-3 border-t border-ink-100 pt-3 text-sm transition-colors hover:text-ink-900"
        title="Lihat baterai yang belum dinilai"
      >
        <span className="size-6 shrink-0 rounded-md border border-dashed border-ink-300" aria-hidden="true" />
        <span className="flex-1 text-ink-500">Belum dinilai</span>
        <span className="num font-medium text-ink-900">
          {counts.belum}
          <span className="ml-1.5 text-xs font-normal text-ink-400">dari {total}</span>
        </span>
      </Link>
    </Card>
  );
}
