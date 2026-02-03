-- =====================================================
-- Script: Crear lead_visits para ventas sin lead_visit
-- Descripción: Crea un lead_visit por cada sale que no tiene
--              lead_visit asociado y lo vincula correctamente
-- =====================================================

-- =====================================================
-- PASO 1: Crear un lead_visit por cada sale que no tiene lead_visit
-- =====================================================

INSERT INTO lead_visits (
    id,
    lead_id,
    "arrivalTime",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    l.id,
    s."createdAt",
    NOW(),
    NOW()
FROM sales s
INNER JOIN clients c ON s."clientId" = c.id
INNER JOIN leads l ON c."leadId" = l.id
WHERE s.lead_visit_id IS NULL;

-- =====================================================
-- PASO 2: Asociar cada sale con su lead_visit recién creado
-- =====================================================

UPDATE sales s
SET lead_visit_id = (
    SELECT lv.id
    FROM lead_visits lv
    INNER JOIN clients c ON s."clientId" = c.id
    INNER JOIN leads l ON c."leadId" = l.id
    WHERE lv.lead_id = l.id
      AND lv."createdAt" >= NOW() - INTERVAL '5 minutes'
      AND NOT EXISTS (
          SELECT 1 FROM sales s2
          WHERE s2.lead_visit_id = lv.id
      )
    LIMIT 1
)
WHERE s.lead_visit_id IS NULL;

-- =====================================================
-- VERIFICACIÓN: Debe retornar 0
-- =====================================================

SELECT COUNT(*) AS ventas_sin_lead_visit
FROM sales
WHERE lead_visit_id IS NULL;
