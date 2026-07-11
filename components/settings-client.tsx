"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Card, ErrorBanner } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { Company } from "@/lib/types";

export function SettingsClient({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // edit state per company
  const [edits, setEdits] = useState<Record<string, { name: string; threshold: string }>>(
    Object.fromEntries(
      companies.map((c) => [
        c.id,
        { name: c.name, threshold: String(c.materiality_threshold) },
      ]),
    ),
  );

  // new company state
  const [newName, setNewName] = useState("");
  const [newThreshold, setNewThreshold] = useState("10000");

  async function call(url: string, method: string, body: unknown) {
    setError(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `Request failed (${res.status})`);
    }
    return res.json();
  }

  async function saveCompany(id: string) {
    const e = edits[id];
    setBusy(id);
    try {
      await call(`/api/companies/${id}`, "PATCH", {
        name: e.name,
        materiality_threshold: Number(e.threshold),
      });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function createCompany() {
    if (!newName.trim()) {
      setError("Company name is required.");
      return;
    }
    setBusy("__new__");
    try {
      await call("/api/companies", "POST", {
        name: newName,
        materiality_threshold: Number(newThreshold),
      });
      setNewName("");
      setNewThreshold("10000");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} />}

      <div className="space-y-3">
        {companies.map((c) => {
          const e = edits[c.id];
          const dirty =
            e.name !== c.name || Number(e.threshold) !== Number(c.materiality_threshold);
          return (
            <Card key={c.id} className="p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    Company name
                  </label>
                  <input
                    className={inputCls}
                    value={e.name}
                    onChange={(ev) =>
                      setEdits({ ...edits, [c.id]: { ...e, name: ev.target.value } })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    Materiality threshold (£)
                  </label>
                  <input
                    type="number"
                    className={inputCls}
                    value={e.threshold}
                    onChange={(ev) =>
                      setEdits({ ...edits, [c.id]: { ...e, threshold: ev.target.value } })
                    }
                  />
                </div>
                <Button
                  onClick={() => saveCompany(c.id)}
                  disabled={!dirty || busy === c.id}
                >
                  {busy === c.id ? "Saving…" : "Save"}
                </Button>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Variances of {formatCurrency(Number(e.threshold) || 0)} or more are
                flagged for commentary.
              </p>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed p-4">
        <h3 className="mb-3 text-sm font-semibold">Add a company</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Company name
            </label>
            <input
              className={inputCls}
              placeholder="Northwind Retail Ltd"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Materiality threshold (£)
            </label>
            <input
              type="number"
              className={inputCls}
              value={newThreshold}
              onChange={(e) => setNewThreshold(e.target.value)}
            />
          </div>
          <Button onClick={createCompany} disabled={busy === "__new__"}>
            {busy === "__new__" ? "Creating…" : "Create"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Next: map its accounts on Account Map, set its Budget, then Ingest a
          trial balance.
        </p>
      </Card>
    </div>
  );
}
