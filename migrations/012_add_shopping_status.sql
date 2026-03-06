-- Migration: Add shopping status to order lines
ALTER TABLE ibgsc.order_lines
ADD COLUMN IF NOT EXISTS shopping_status TEXT;
-- 'FOUND', 'NOT_FOUND', 'ALTERNATIVE'