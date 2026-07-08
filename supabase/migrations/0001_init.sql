create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  materiality_threshold numeric not null default 5000,
  created_at timestamptz not null default now()
);
alter table companies enable row level security;
drop policy if exists "companies_v1_read" on companies;
create policy "companies_v1_read" on companies for select using (true);
drop policy if exists "companies_v1_write" on companies;
create policy "companies_v1_write" on companies for all using (true) with check (true);

create table if not exists account_map (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  company_id uuid references companies(id),
  raw_account_code text not null,
  raw_account_name text not null,
  management_line text not null,
  segment text,
  sign_convention numeric not null default 1,
  created_at timestamptz not null default now()
);
alter table account_map enable row level security;
drop policy if exists "account_map_v1_read" on account_map;
create policy "account_map_v1_read" on account_map for select using (true);
drop policy if exists "account_map_v1_write" on account_map;
create policy "account_map_v1_write" on account_map for all using (true) with check (true);

create table if not exists budget_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  company_id uuid references companies(id),
  period date not null,
  management_line text not null,
  segment text,
  amount numeric not null,
  created_at timestamptz not null default now()
);
alter table budget_lines enable row level security;
drop policy if exists "budget_lines_v1_read" on budget_lines;
create policy "budget_lines_v1_read" on budget_lines for select using (true);
drop policy if exists "budget_lines_v1_write" on budget_lines;
create policy "budget_lines_v1_write" on budget_lines for all using (true) with check (true);

create table if not exists ingest_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  company_id uuid references companies(id),
  filename text not null,
  period date not null,
  ingested_at timestamptz not null default now(),
  checksum text not null,
  status text not null default 'pending',
  row_count integer,
  error_message text,
  created_at timestamptz not null default now()
);
alter table ingest_logs enable row level security;
drop policy if exists "ingest_logs_v1_read" on ingest_logs;
create policy "ingest_logs_v1_read" on ingest_logs for select using (true);
drop policy if exists "ingest_logs_v1_write" on ingest_logs;
create policy "ingest_logs_v1_write" on ingest_logs for all using (true) with check (true);

create table if not exists actuals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  company_id uuid references companies(id),
  ingest_log_id uuid references ingest_logs(id),
  period date not null,
  raw_account_code text not null,
  raw_account_name text not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);
alter table actuals enable row level security;
drop policy if exists "actuals_v1_read" on actuals;
create policy "actuals_v1_read" on actuals for select using (true);
drop policy if exists "actuals_v1_write" on actuals;
create policy "actuals_v1_write" on actuals for all using (true) with check (true);

create table if not exists variance_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  company_id uuid references companies(id),
  period date not null,
  management_line text not null,
  segment text,
  actual_amount numeric not null,
  budget_amount numeric not null,
  variance_amount numeric not null,
  variance_pct numeric,
  is_flagged boolean not null default false,
  review_status text not null default 'unreviewed',
  created_at timestamptz not null default now()
);
alter table variance_lines enable row level security;
drop policy if exists "variance_lines_v1_read" on variance_lines;
create policy "variance_lines_v1_read" on variance_lines for select using (true);
drop policy if exists "variance_lines_v1_write" on variance_lines;
create policy "variance_lines_v1_write" on variance_lines for all using (true) with check (true);

create table if not exists commentaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  company_id uuid references companies(id),
  variance_line_id uuid references variance_lines(id),
  period date not null,
  management_line text not null,
  commentary_text text not null,
  commentary_source text not null default 'draft',
  commentary_confidence numeric,
  review_status text not null default 'unreviewed',
  owner_name text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table commentaries enable row level security;
drop policy if exists "commentaries_v1_read" on commentaries;
create policy "commentaries_v1_read" on commentaries for select using (true);
drop policy if exists "commentaries_v1_write" on commentaries;
create policy "commentaries_v1_write" on commentaries for all using (true) with check (true);

create table if not exists commentary_edits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  commentary_id uuid references commentaries(id),
  previous_text text not null,
  new_text text not null,
  edited_by text,
  edited_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table commentary_edits enable row level security;
drop policy if exists "commentary_edits_v1_read" on commentary_edits;
create policy "commentary_edits_v1_read" on commentary_edits for select using (true);
drop policy if exists "commentary_edits_v1_write" on commentary_edits;
create policy "commentary_edits_v1_write" on commentary_edits for all using (true) with check (true);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  company_id uuid references companies(id),
  period date not null,
  status text not null default 'draft',
  published_at timestamptz,
  published_by text,
  snapshot_json jsonb,
  created_at timestamptz not null default now()
);
alter table reports enable row level security;
drop policy if exists "reports_v1_read" on reports;
create policy "reports_v1_read" on reports for select using (true);
drop policy if exists "reports_v1_write" on reports;
create policy "reports_v1_write" on reports for all using (true) with check (true);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  object_type text not null,
  object_id uuid,
  detail jsonb,
  performed_by text,
  created_at timestamptz not null default now()
);
alter table audit_logs enable row level security;
drop policy if exists "audit_logs_v1_read" on audit_logs;
create policy "audit_logs_v1_read" on audit_logs for select using (true);
drop policy if exists "audit_logs_v1_write" on audit_logs;
create policy "audit_logs_v1_write" on audit_logs for all using (true) with check (true);

insert into companies (id, name, materiality_threshold) values
  ('a1000000-0000-0000-0000-000000000001', 'Acme Group Ltd', 5000),
  ('a1000000-0000-0000-0000-000000000002', 'Demo Manufacturing Co', 10000);

insert into account_map (company_id, raw_account_code, raw_account_name, management_line, segment, sign_convention) values
  ('a1000000-0000-0000-0000-000000000001', '4000', 'Product Revenue', 'Revenue', 'Product', 1),
  ('a1000000-0000-0000-0000-000000000001', '4100', 'Service Revenue', 'Revenue', 'Services', 1),
  ('a1000000-0000-0000-0000-000000000001', '5000', 'Cost of Goods Sold', 'Cost of Sales', 'Product', -1),
  ('a1000000-0000-0000-0000-000000000001', '6000', 'Salaries & Wages', 'Personnel Costs', 'Central', -1),
  ('a1000000-0000-0000-0000-000000000001', '6100', 'Office & Facilities', 'Overhead', 'Central', -1),
  ('a1000000-0000-0000-0000-000000000001', '7000', 'Marketing Spend', 'Sales & Marketing', 'Central', -1);

insert into budget_lines (company_id, period, management_line, segment, amount) values
  ('a1000000-0000-0000-0000-000000000001', '2025-03-01', 'Revenue', 'Product', 250000),
  ('a1000000-0000-0000-0000-000000000001', '2025-03-01', 'Revenue', 'Services', 80000),
  ('a1000000-0000-0000-0000-000000000001', '2025-03-01', 'Cost of Sales', 'Product', -120000),
  ('a1000000-0000-0000-0000-000000000001', '2025-03-01', 'Personnel Costs', 'Central', -95000),
  ('a1000000-0000-0000-0000-000000000001', '2025-03-01', 'Overhead', 'Central', -18000),
  ('a1000000-0000-0000-0000-000000000001', '2025-03-01', 'Sales & Marketing', 'Central', -22000);

insert into ingest_logs (id, company_id, filename, period, checksum, status, row_count) values
  ('b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'TB_Acme_Mar2025.csv', '2025-03-01', 'sha256:abc123demo', 'processed', 142);

insert into variance_lines (id, company_id, period, management_line, segment, actual_amount, budget_amount, variance_amount, variance_pct, is_flagged, review_status) values
  ('c3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '2025-03-01', 'Revenue', 'Product', 231000, 250000, -19000, -7.6, true, 'unreviewed'),
  ('c3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', '2025-03-01', 'Revenue', 'Services', 84000, 80000, 4000, 5.0, false, 'unreviewed'),
  ('c3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', '2025-03-01', 'Cost of Sales', 'Product', -138000, -120000, -18000, -15.0, true, 'unreviewed'),
  ('c3000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', '2025-03-01', 'Personnel Costs', 'Central', -97500, -95000, -2500, -2.6, false, 'unreviewed'),
  ('c3000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', '2025-03-01', 'Overhead', 'Central', -18200, -18000, -200, -1.1, false, 'cleared'),
  ('c3000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001', '2025-03-01', 'Sales & Marketing', 'Central', -29500, -22000, -7500, -34.1, true, 'unreviewed');

insert into commentaries (id, company_id, variance_line_id, period, management_line, commentary_text, commentary_source, commentary_confidence, review_status, owner_name, is_published) values
  ('d4000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', '2025-03-01', 'Revenue – Product', 'Product revenue was £19k below budget. Two enterprise deals slipped into April following procurement delays at the customer. Pipeline remains strong.', 'finance_draft', 0.9, 'reviewed', 'Sarah M.', false),
  ('d4000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000003', '2025-03-01', 'Cost of Sales – Product', 'COGS exceeded budget by £18k due to an unplanned supplier surcharge on Q1 raw material orders. Procurement team is negotiating rebate.', 'finance_draft', 0.85, 'unreviewed', 'James T.', false),
  ('d4000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000006', '2025-03-01', 'Sales & Marketing', 'Marketing spend was £7.5k over budget. The digital campaign was brought forward from Q2 at the request of the commercial director to support the new product launch.', 'finance_draft', 0.8, 'unreviewed', 'Sarah M.', false);

insert into reports (company_id, period, status) values
  ('a1000000-0000-0000-0000-000000000001', '2025-03-01', 'draft');