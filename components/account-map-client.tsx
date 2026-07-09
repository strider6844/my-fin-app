"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Badge, Card, EmptyState, ErrorBanner } from "@/components/ui";
import type { AccountMapRow } from "@/lib/types";

type Draft = {
  raw_account_code: string;
  raw_account_name: string;
  management_line: string;
  segment: string;
  sign_convention: number;
};

const emptyDraft: Draft = {
  raw_account_code: "",
  raw_account_name: "",
  management_line: "",
  segment: "",
  sign_convention: 1,
};

export function AccountMapClient({
  rows,
  companyId,
}: {
  rows: AccountMapRow[];
  companyId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<Draft>(emptyDraft);

  async function call(url: string, method: string, body?: unknown) {
    setError(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `Request failed (${res.status})`);
    }
    return res.json();
  }

  async function handleAdd() {
    if (!addDraft.raw_account_code || !addDraft.management_line) {
      setError("Account code and management line are required.");
      return;
    }
    setBusyId("__add__");
    try {
      await call("/api/account-map", "POST", { company_id: companyId, ...addDraft });
      setAddDraft(emptyDraft);
      setAdding(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveEdit(id: string) {
    setBusyId(id);
    try {
      await call(`/api/account-map/${id}`, "PATCH", editDraft);
      setEditingId(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this mapping? This affects future ingests.")) return;
    setBusyId(id);
    try {
      await call(`/api/account-map/${id}`, "DELETE");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(r: AccountMapRow) {
    setEditingId(r.id);
    setEditDraft({
      raw_account_code: r.raw_account_code,
      raw_account_name: r.raw_account_name,
      management_line: r.management_line,
      segment: r.segment ?? "",
      sign_convention: Number(r.sign_convention),
    });
  }

  const inputCls =
    "w-full rounded-md border border-[var(--border)] px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none";

  function DraftFields({
    draft,
    set,
  }: {
    draft: Draft;
    set: (d: Draft) => void;
  }) {
    return (
      <>
        <td className="px-2 py-1.5">
          <input
            className={inputCls}
            value={draft.raw_account_code}
            placeholder="4000"
            onChange={(e) => set({ ...draft, raw_account_code: e.target.value })}
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            className={inputCls}
            value={draft.raw_account_name}
            placeholder="Product Revenue"
            onChange={(e) => set({ ...draft, raw_account_name: e.target.value })}
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            className={inputCls}
            value={draft.management_line}
            placeholder="Revenue"
            onChange={(e) => set({ ...draft, management_line: e.target.value })}
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            className={inputCls}
            value={draft.segment}
            placeholder="Product"
            onChange={(e) => set({ ...draft, segment: e.target.value })}
          />
        </td>
        <td className="px-2 py-1.5">
          <select
            className={inputCls}
            value={draft.sign_convention}
            onChange={(e) =>
              set({ ...draft, sign_convention: Number(e.target.value) })
            }
          >
            <option value={1}>+1 (income)</option>
            <option value={-1}>−1 (cost)</option>
          </select>
        </td>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}

      <Card className="overflow-hidden">
        {rows.length === 0 && !adding ? (
          <EmptyState
            title="No account mappings yet"
            message="Map your raw trial-balance account codes to management P&L lines. This is defined once per company."
            action={
              <Button onClick={() => setAdding(true)}>+ Add first mapping</Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Raw account name</th>
                  <th className="px-3 py-2 font-medium">Management line</th>
                  <th className="px-3 py-2 font-medium">Segment</th>
                  <th className="px-3 py-2 font-medium">Sign</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) =>
                  editingId === r.id ? (
                    <tr key={r.id} className="border-b border-slate-100 bg-indigo-50/40">
                      <DraftFields draft={editDraft} set={setEditDraft} />
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="primary"
                            className="px-2 py-1"
                            disabled={busyId === r.id}
                            onClick={() => handleSaveEdit(r.id)}
                          >
                            {busyId === r.id ? "Saving…" : "Save"}
                          </Button>
                          <Button
                            variant="ghost"
                            className="px-2 py-1"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono text-slate-700">
                        {r.raw_account_code}
                      </td>
                      <td className="px-3 py-2.5">{r.raw_account_name}</td>
                      <td className="px-3 py-2.5 font-medium">{r.management_line}</td>
                      <td className="px-3 py-2.5 text-slate-500">{r.segment ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        {Number(r.sign_convention) === -1 ? (
                          <Badge tone="amber">−1 cost</Badge>
                        ) : (
                          <Badge tone="green">+1 income</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="secondary"
                            className="px-2 py-1"
                            onClick={() => startEdit(r)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            className="px-2 py-1"
                            disabled={busyId === r.id}
                            onClick={() => handleDelete(r.id)}
                          >
                            {busyId === r.id ? "…" : "Delete"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}

                {adding && (
                  <tr className="border-b border-slate-100 bg-emerald-50/40">
                    <DraftFields draft={addDraft} set={setAddDraft} />
                    <td className="px-2 py-1.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          className="px-2 py-1"
                          disabled={busyId === "__add__"}
                          onClick={handleAdd}
                        >
                          {busyId === "__add__" ? "Adding…" : "Add"}
                        </Button>
                        <Button
                          variant="ghost"
                          className="px-2 py-1"
                          onClick={() => {
                            setAdding(false);
                            setAddDraft(emptyDraft);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {!adding && rows.length > 0 && (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          + Add mapping
        </Button>
      )}
    </div>
  );
}
