-- ========================================
-- MIGRACIÓN: Mover participantes y reportPdfUrl de Lead a LeadVisit
-- ========================================
-- IMPORTANTE: Hacer backup de la base de datos antes de ejecutar
-- ========================================

-- PASO 1: Agregar nuevas columnas a lead_visits
ALTER TABLE lead_visits
ADD COLUMN report_pdf_url VARCHAR(500),
ADD COLUMN liner_participant_id UUID,
ADD COLUMN telemarketing_supervisor_id UUID,
ADD COLUMN telemarketing_confirmer_id UUID,
ADD COLUMN telemarketer_id UUID,
ADD COLUMN field_manager_id UUID,
ADD COLUMN field_supervisor_id UUID,
ADD COLUMN field_seller_id UUID,
ADD COLUMN sales_manager_id UUID,
ADD COLUMN sales_general_manager_id UUID,
ADD COLUMN post_sale_id UUID,
ADD COLUMN closer_id UUID;

-- PASO 2: Agregar foreign keys a lead_visits
ALTER TABLE lead_visits
ADD CONSTRAINT fk_lead_visits_liner_participant
    FOREIGN KEY (liner_participant_id) REFERENCES participants(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_lead_visits_telemarketing_supervisor
    FOREIGN KEY (telemarketing_supervisor_id) REFERENCES participants(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_lead_visits_telemarketing_confirmer
    FOREIGN KEY (telemarketing_confirmer_id) REFERENCES participants(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_lead_visits_telemarketer
    FOREIGN KEY (telemarketer_id) REFERENCES participants(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_lead_visits_field_manager
    FOREIGN KEY (field_manager_id) REFERENCES participants(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_lead_visits_field_supervisor
    FOREIGN KEY (field_supervisor_id) REFERENCES participants(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_lead_visits_field_seller
    FOREIGN KEY (field_seller_id) REFERENCES participants(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_lead_visits_sales_manager
    FOREIGN KEY (sales_manager_id) REFERENCES participants(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_lead_visits_sales_general_manager
    FOREIGN KEY (sales_general_manager_id) REFERENCES participants(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_lead_visits_post_sale
    FOREIGN KEY (post_sale_id) REFERENCES participants(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_lead_visits_closer
    FOREIGN KEY (closer_id) REFERENCES participants(id) ON DELETE SET NULL;

-- PASO 3: Agregar columna lead_visit_id a sales
ALTER TABLE sales
ADD COLUMN lead_visit_id UUID;

ALTER TABLE sales
ADD CONSTRAINT fk_sales_lead_visit
    FOREIGN KEY (lead_visit_id) REFERENCES lead_visits(id) ON DELETE SET NULL;

-- PASO 4: Migrar datos de leads a la última visita de cada lead
-- (Solo si hay datos existentes que migrar)
UPDATE lead_visits lv
SET
    report_pdf_url = l.report_pdf_url,
    liner_participant_id = l.liner_id,
    telemarketing_supervisor_id = l.telemarketing_supervisor_id,
    telemarketing_confirmer_id = l.telemarketing_confirmer_id,
    telemarketer_id = l.telemarketer_id,
    field_manager_id = l.field_manager_id,
    field_supervisor_id = l.field_supervisor_id,
    field_seller_id = l.field_seller_id,
    sales_manager_id = l.sales_manager_id,
    sales_general_manager_id = l.sales_general_manager_id,
    post_sale_id = l.post_sale_id,
    closer_id = l.closer_id
FROM leads l
WHERE lv.lead_id = l.id
AND lv.id = (
    SELECT id
    FROM lead_visits
    WHERE lead_id = l.id
    ORDER BY created_at DESC
    LIMIT 1
);

-- PASO 5: Eliminar columnas antiguas de leads
-- ADVERTENCIA: Solo ejecutar después de verificar que los datos se migraron correctamente
ALTER TABLE leads
DROP COLUMN IF EXISTS report_pdf_url,
DROP COLUMN IF EXISTS liner_id,
DROP COLUMN IF EXISTS telemarketing_supervisor_id,
DROP COLUMN IF EXISTS telemarketing_confirmer_id,
DROP COLUMN IF EXISTS telemarketer_id,
DROP COLUMN IF EXISTS field_manager_id,
DROP COLUMN IF EXISTS field_supervisor_id,
DROP COLUMN IF EXISTS field_seller_id,
DROP COLUMN IF EXISTS sales_manager_id,
DROP COLUMN IF EXISTS sales_general_manager_id,
DROP COLUMN IF EXISTS post_sale_id,
DROP COLUMN IF EXISTS closer_id;

-- ========================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ========================================
-- Ejecutar estas queries para verificar que todo está bien:

-- 1. Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'lead_visits'
AND column_name IN ('report_pdf_url', 'liner_participant_id', 'telemarketing_supervisor_id');

-- 2. Contar cuántas visitas tienen participantes asignados
SELECT
    COUNT(*) as total_visits,
    COUNT(liner_participant_id) as with_liner,
    COUNT(report_pdf_url) as with_pdf
FROM lead_visits;

-- 3. Verificar que las columnas se eliminaron de leads
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name IN ('report_pdf_url', 'liner_id', 'telemarketing_supervisor_id');
-- (Esta query no debería retornar nada)
