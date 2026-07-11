import Link from "next/link";
import { Card, PageHeader, Badge } from "@/components/ui";

export const dynamic = "force-static";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
        {n}
      </span>
      <div>
        <div className="font-medium text-slate-800">{title}</div>
        <div className="mt-0.5 text-sm text-[var(--muted)]">{children}</div>
      </div>
    </li>
  );
}

export default function GuidePage() {
  return (
    <>
      <PageHeader
        title="How to use my-fin-app"
        subtitle="Turn a raw trial balance into a board-ready management report — no Excel, full audit trail."
      />

      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">The core idea</h2>
          <p className="mt-2 text-sm text-slate-600">
            You keep three things set up per company — the{" "}
            <strong>account map</strong> (which raw codes belong to which P&amp;L
            line), the <strong>budget</strong> (the plan you measure against), and
            the <strong>materiality threshold</strong> (how big a variance has to
            be before it needs an explanation). Each month you just drop in that
            month&apos;s trial balance; the app computes the variances, flags the
            material ones, you explain them, and publish.
          </p>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Badge tone="indigo">First-time setup</Badge>
            <span className="text-sm text-[var(--muted)]">Do this once per company</span>
          </div>
          <ol className="space-y-4">
            <Step n={1} title="Create the company">
              Go to <GuideLink href="/settings">Settings</GuideLink> → “Add a
              company”. Enter the name and the materiality threshold (e.g. $10,000
              — variances at or above this get flagged). Save.
            </Step>
            <Step n={2} title="Map the accounts">
              Go to <GuideLink href="/account-map">Account Map</GuideLink>. For each
              raw account code in your accounting system, add a row: the code, its
              name, the management line it rolls up to (e.g. “Revenue”), an optional
              segment (e.g. “Online”), and the sign — <em>+1 income</em> or{" "}
              <em>−1 cost</em>. Costs use −1 so they subtract on the P&amp;L.
            </Step>
            <Step n={3} title="Enter the budget">
              Go to <GuideLink href="/budget">Budget</GuideLink>, pick the month,
              and type the planned amount for each management line (positive numbers
              — costs are subtracted for you). Save. This is the benchmark every
              variance is measured against.
            </Step>
            <Step n={4} title="Ingest the trial balance">
              Go to <GuideLink href="/ingest">Ingest</GuideLink>, choose the company
              and month, upload the trial-balance file (CSV or XLSX) and click{" "}
              <strong>Generate Report</strong>. The engine parses it, matches codes
              to your map, computes variances, and flags the material ones.
            </Step>
            <Step n={5} title="Review, explain, publish">
              Open the report, read the flagged lines, edit the commentary to
              explain each one, then <strong>Publish</strong> (or Submit for CFO
              approval). Done — it&apos;s live and read-only for the board.
            </Step>
          </ol>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Badge tone="green">Every month (the close)</Badge>
            <span className="text-sm text-[var(--muted)]">≈ 5 minutes</span>
          </div>
          <ol className="space-y-4">
            <Step n={1} title="Confirm / update the budget for the new month">
              <GuideLink href="/budget">Budget</GuideLink> → select the month. If the
              plan carries forward, re-enter the same figures; if it changed, adjust
              them. Save. (New management lines? Add the mapping first.)
            </Step>
            <Step n={2} title="Upload the month's trial balance">
              <GuideLink href="/ingest">Ingest</GuideLink> → pick the month → upload
              the TB export → Generate Report. Re-uploading the same month simply
              regenerates it (your commentary is kept).
            </Step>
            <Step n={3} title="Review the flagged lines">
              Open the report. Flagged lines are sorted to the top. Each one needs a
              “why”.
            </Step>
            <Step n={4} title="Edit the commentary inline">
              Click <strong>Edit</strong> under a flagged line, write the
              explanation, <strong>Save</strong>. Every change is versioned — click{" "}
              <strong>Edit history</strong> to see prior text and who changed it.
            </Step>
            <Step n={5} title="Submit → approve → publish">
              Finance clicks <strong>Submit for approval</strong>; the CFO opens the
              same report and clicks <strong>Approve &amp; Publish</strong> (or
              Reject to draft). Published reports are frozen into the{" "}
              <GuideLink href="/archive">Board Pack</GuideLink> archive.
            </Step>
            <Step n={6} title="Glance at the forecast">
              After the month is in, open{" "}
              <GuideLink href="/model">Forecast</GuideLink> — the projection re-bases
              automatically on the new actuals. If the outlook has shifted, adjust
              the drivers (see below) before the board asks.
            </Step>
          </ol>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Badge tone="amber">Financial model</Badge>
            <span className="text-sm text-[var(--muted)]">
              The forward-looking side — forecast, scenarios, drivers
            </span>
          </div>
          <p className="mb-4 text-sm text-slate-600">
            Reporting looks <em>backward</em> (what happened vs budget). The model
            looks <em>forward</em>: it takes each management line&apos;s recent
            actuals (trailing 3-month average) and grows them month by month using
            editable <strong>drivers</strong>, out ~2 years. Nothing is typed into
            the forecast directly — change a driver and every figure recomputes.
          </p>
          <ol className="space-y-4">
            <Step n={1} title="Open the Forecast">
              <GuideLink href="/model">Forecast</GuideLink> shows the net-result
              outlook (solid line = actuals, dashed = forecast), FY totals per year,
              and the full P&amp;L by line. Use the tabs at the top to switch
              scenario.
            </Step>
            <Step n={2} title="Understand the three scenarios">
              Every projection exists in three versions, side by side on{" "}
              <GuideLink href="/model/scenarios">Scenarios</GuideLink>:{" "}
              <strong>Base</strong> — your central planning view (default: revenue
              +8%/yr, costs +6%/yr); <strong>Conservative</strong> — slower revenue,
              faster cost growth (+3%/+8%) to stress-test the downside;{" "}
              <strong>Upside</strong> — stronger growth with contained costs
              (+15%/+5%). Same actuals, different assumptions — the spread between
              them is your planning range.
            </Step>
            <Step n={3} title="Tune the drivers">
              <GuideLink href="/model/assumptions">Drivers</GuideLink> is the
              assumption register: one row per driver, one value per scenario, in %
              per annum. Type the number you believe (e.g. Base revenue growth 10),
              click <strong>Save drivers</strong> — the Forecast and Scenarios pages
              recompute instantly. Each save is recorded with who changed it and
              when.
            </Step>
            <Step n={4} title="Read the range, then commit to a plan">
              Use Conservative to check you survive the downside (cash, cost cover),
              Base for the plan you publish, and Upside to size the opportunity.
              When the board asks &quot;what if revenue slows?&quot; — the answer is
              already on the Scenarios page.
            </Step>
          </ol>
          <p className="mt-4 text-xs text-[var(--muted)]">
            The forecast needs at least one ingested month of actuals per company.
            Northwind Retail has Jan–Jun 2026 loaded, so its model runs out of the
            box.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-lg font-semibold">Where to amend each assumption</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-3 py-2 font-medium">Assumption</th>
                  <th className="px-3 py-2 font-medium">Where</th>
                  <th className="px-3 py-2 font-medium">What it controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-3 py-2.5 font-medium">Materiality threshold</td>
                  <td className="px-3 py-2.5"><GuideLink href="/settings">Settings</GuideLink></td>
                  <td className="px-3 py-2.5 text-[var(--muted)]">How big a variance must be to get flagged.</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-medium">Account mapping &amp; sign</td>
                  <td className="px-3 py-2.5"><GuideLink href="/account-map">Account Map</GuideLink></td>
                  <td className="px-3 py-2.5 text-[var(--muted)]">Which raw code rolls into which line, and income vs cost.</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-medium">Budget / plan</td>
                  <td className="px-3 py-2.5"><GuideLink href="/budget">Budget</GuideLink></td>
                  <td className="px-3 py-2.5 text-[var(--muted)]">The benchmark each line's actuals are compared to.</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-medium">Commentary (the “why”)</td>
                  <td className="px-3 py-2.5"><GuideLink href="/report">Reports</GuideLink> → open a report</td>
                  <td className="px-3 py-2.5 text-[var(--muted)]">The explanation on each flagged line; versioned on every edit.</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-medium">Forecast drivers (per scenario)</td>
                  <td className="px-3 py-2.5"><GuideLink href="/model/assumptions">Drivers</GuideLink></td>
                  <td className="px-3 py-2.5 text-[var(--muted)]">Revenue &amp; cost growth for Base / Conservative / Upside; saving recomputes the whole forecast.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-lg font-semibold">Trial-balance file format</h2>
          <p className="text-sm text-slate-600">
            A CSV or XLSX with one row per account. The parser looks for an{" "}
            <strong>account code</strong> column and an <strong>amount</strong>{" "}
            column (or a <strong>debit</strong>/<strong>credit</strong> pair). Enter
            amounts as natural positive magnitudes — the −1 sign on cost accounts in
            your map handles the rest. Column headers are flexible (code, account,
            nominal / amount, balance, value).
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
{`account_code,account_name,amount
4000,In-Store Sales,412000
5000,Cost of Goods Sold,208500
6000,Store Salaries,88000`}
          </pre>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Monthly sample files (<strong>TB_Northwind_&lt;Month&gt;2026.csv</strong>{" "}
            for Jan–Dec) plus{" "}
            <a className="font-medium text-indigo-600 hover:underline" href="/samples/TB_Acme_Mar2025.csv" download>
              TB_Acme_Mar2025.csv
            </a>{" "}
            live in the app&apos;s <code>public/samples/</code> folder — e.g.{" "}
            <a className="font-medium text-indigo-600 hover:underline" href="/samples/TB_Northwind_Jul2026.csv" download>
              TB_Northwind_Jul2026.csv
            </a>.
          </p>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50/40 p-5">
          <h2 className="mb-2 text-lg font-semibold">
            A full year is already loaded to test-drive
          </h2>
          <p className="text-sm text-slate-600">
            <strong>Northwind Retail Ltd</strong> (financial year ending Dec 2026)
            has a complete 12-month budget in place, and the closed months{" "}
            <strong>Jan–Jun 2026</strong> are ingested as <strong>draft</strong>{" "}
            reports — each material variance already has a sample explanation you
            can edit, then submit and publish. To continue the year, set the budget
            for the next month (it&apos;s pre-loaded through December), upload that
            month&apos;s TB, and repeat.{" "}
            <a className="font-medium text-indigo-600 hover:underline" href="/report?company=b1000000-0000-0000-0000-000000000010">
              Open Northwind&apos;s reports →
            </a>
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-lg font-semibold">Troubleshooting</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              <strong>“Unmapped codes” warning after ingest</strong> — those codes
              aren&apos;t in your account map. Add them on Account Map and re-ingest;
              mapped lines were still computed.
            </li>
            <li>
              <strong>“No budget loaded”</strong> — set the budget for that month on
              the Budget page, then re-ingest. Actuals still show; nothing is
              flagged without a benchmark.
            </li>
            <li>
              <strong>“Unsupported file type”</strong> — export as CSV or XLSX.
            </li>
            <li>
              <strong>Need to change a published report</strong> — open it and click
              Revert to draft, edit, then publish again.
            </li>
            <li>
              <strong>Everything is recorded</strong> — every ingest, edit, and
              publish is on the <GuideLink href="/ingest-log">Log</GuideLink> page.
            </li>
          </ul>
        </Card>

        <div className="pb-4 text-center">
          <Link
            href="/ingest"
            className="inline-flex items-center rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Start now → Ingest a trial balance
          </Link>
        </div>
      </div>
    </>
  );
}

function GuideLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-indigo-600 hover:underline">
      {children}
    </Link>
  );
}
