import { Donut } from "@/components/charts";
import { Card, GradeBadge, SectionTitle, gradeTone } from "@/components/ui";
import type { Grade } from "@/lib/types";

export function GradeDistribution({ counts }: { counts: Record<Grade | "belum", number> }) {
  const dinilai = counts.A + counts.B + counts.C + counts.D;
  return (
    <Card>
      <SectionTitle title="Distribusi grade" hint="Kondisi baterai yang sudah dinilai" />
      <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col">
        <Donut
          label="Distribusi grade baterai"
          segments={(["A", "B", "C", "D"] as Grade[]).map((g) => ({ label: `Grade ${g}`, value: counts[g], color: gradeTone[g].hex }))}
          center={
            <div>
              <p className="num text-3xl font-medium">{dinilai}</p>
              <p className="text-xs text-ink-500">dinilai</p>
            </div>
          }
        />
        <ul className="w-full flex-1 space-y-2.5">
          {(["A", "B", "C", "D"] as Grade[]).map((g) => (
            <li key={g} className="flex items-center gap-3 text-sm">
              <GradeBadge grade={g} size="sm" />
              <span className="flex-1 text-ink-600">{gradeTone[g].label}</span>
              <span className="num font-medium">{counts[g]}</span>
            </li>
          ))}
          <li className="flex items-center gap-3 border-t border-ink-100 pt-2.5 text-sm">
            <span className="size-6 rounded-md border border-dashed border-ink-300" />
            <span className="flex-1 text-ink-500">Belum dinilai</span>
            <span className="num font-medium">{counts.belum}</span>
          </li>
        </ul>
      </div>
    </Card>
  );
}
