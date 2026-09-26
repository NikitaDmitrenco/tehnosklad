-- Tehnosklad: leads submitted from the catalog assistant widget.
-- Postgres forbids using a new enum value in the transaction that adds it,
-- so this migration only extends public.lead_source.
alter type public.lead_source add value if not exists 'assistant';
