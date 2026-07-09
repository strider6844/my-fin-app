"use client";

import { useRouter } from "next/navigation";
import type { Company } from "@/lib/types";

export function CompanySelector({
  companies,
  selectedId,
  basePath,
}: {
  companies: Company[];
  selectedId: string;
  basePath: string;
}) {
  const router = useRouter();
  if (companies.length <= 1) return null;
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
      Company
      <select
        className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm text-slate-800"
        value={selectedId}
        onChange={(e) => router.push(`${basePath}?company=${e.target.value}`)}
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
