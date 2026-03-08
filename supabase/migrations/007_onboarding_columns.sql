-- Add onboarding-related columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_voice text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS account_manager text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_start date;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS monthly_volume integer;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS platform_focus text[];
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_checklist jsonb;
