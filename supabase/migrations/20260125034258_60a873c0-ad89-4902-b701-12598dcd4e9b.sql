-- Add bill_number column to debtors table
ALTER TABLE public.debtors ADD COLUMN bill_number TEXT DEFAULT '';

-- Also add to debtor_ledger for reference if needed
ALTER TABLE public.debtor_ledger ADD COLUMN bill_number TEXT DEFAULT '';