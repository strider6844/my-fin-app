-- Retail sample company for end-to-end testing: Northwind Retail Ltd.
-- Company + account map + June-2026 budget. Trial-balance files to ingest live
-- in public/samples/ (TB_Northwind_Jun2026.csv, TB_Northwind_Jul2026.csv).
-- Data-only migration; never edit 0001. Safe to run once.

insert into companies (id, name, materiality_threshold) values
  ('b1000000-0000-0000-0000-000000000010', 'Northwind Retail Ltd', 10000)
on conflict (id) do nothing;

insert into account_map (company_id, raw_account_code, raw_account_name, management_line, segment, sign_convention) values
  ('b1000000-0000-0000-0000-000000000010', '4000', 'In-Store Sales',          'Revenue',       'In-Store',    1),
  ('b1000000-0000-0000-0000-000000000010', '4010', 'Online Sales',            'Revenue',       'Online',      1),
  ('b1000000-0000-0000-0000-000000000010', '4020', 'Click & Collect',         'Revenue',       'Online',      1),
  ('b1000000-0000-0000-0000-000000000010', '4900', 'Sales Returns',           'Revenue',       'Returns',    -1),
  ('b1000000-0000-0000-0000-000000000010', '5000', 'Cost of Goods Sold',      'Cost of Sales', 'Merchandise',-1),
  ('b1000000-0000-0000-0000-000000000010', '5100', 'Carriage Inwards',        'Cost of Sales', 'Merchandise',-1),
  ('b1000000-0000-0000-0000-000000000010', '5200', 'Stock Shrinkage',         'Cost of Sales', 'Shrinkage',  -1),
  ('b1000000-0000-0000-0000-000000000010', '6000', 'Store Salaries',          'Personnel',     'Stores',     -1),
  ('b1000000-0000-0000-0000-000000000010', '6010', 'Head Office Salaries',    'Personnel',     'Central',    -1),
  ('b1000000-0000-0000-0000-000000000010', '6020', 'Staff Bonuses',           'Personnel',     'Central',    -1),
  ('b1000000-0000-0000-0000-000000000010', '6100', 'Store Rent',              'Property',      'Stores',     -1),
  ('b1000000-0000-0000-0000-000000000010', '6110', 'Utilities',               'Property',      'Stores',     -1),
  ('b1000000-0000-0000-0000-000000000010', '6200', 'Marketing & Advertising', 'Marketing',     'Central',    -1),
  ('b1000000-0000-0000-0000-000000000010', '6300', 'Distribution & Delivery', 'Logistics',     'Central',    -1),
  ('b1000000-0000-0000-0000-000000000010', '6400', 'Depreciation',            'Overhead',      'Central',    -1),
  ('b1000000-0000-0000-0000-000000000010', '6500', 'Insurance',               'Overhead',      'Central',    -1),
  ('b1000000-0000-0000-0000-000000000010', '6600', 'IT & Software',           'Overhead',      'Central',    -1);

insert into budget_lines (company_id, period, management_line, segment, amount) values
  ('b1000000-0000-0000-0000-000000000010', '2026-06-01', 'Revenue',       'In-Store',     450000),
  ('b1000000-0000-0000-0000-000000000010', '2026-06-01', 'Revenue',       'Online',       180000),
  ('b1000000-0000-0000-0000-000000000010', '2026-06-01', 'Revenue',       'Returns',      -15000),
  ('b1000000-0000-0000-0000-000000000010', '2026-06-01', 'Cost of Sales', 'Merchandise', -260000),
  ('b1000000-0000-0000-0000-000000000010', '2026-06-01', 'Cost of Sales', 'Shrinkage',     -6000),
  ('b1000000-0000-0000-0000-000000000010', '2026-06-01', 'Personnel',     'Stores',       -95000),
  ('b1000000-0000-0000-0000-000000000010', '2026-06-01', 'Personnel',     'Central',      -60000),
  ('b1000000-0000-0000-0000-000000000010', '2026-06-01', 'Property',      'Stores',       -48000),
  ('b1000000-0000-0000-0000-000000000010', '2026-06-01', 'Marketing',     'Central',      -30000),
  ('b1000000-0000-0000-0000-000000000010', '2026-06-01', 'Logistics',     'Central',      -22000),
  ('b1000000-0000-0000-0000-000000000010', '2026-06-01', 'Overhead',      'Central',      -35000);
