-- Height was collected at onboarding but never used (benchmarks use
-- bodyweight, sex and age). Stop storing personal data with no purpose.
alter table public.profiles drop column if exists height_cm;
