-- Pilotage / rentabilité — structure future Supabase (sync locale → cloud)
-- Les données devis/chantiers restent en localStorage V1 ; cette migration prépare la persistance.

-- Extension lignes de devis (si table quote_line_items existe côté cloud)
-- ALTER TABLE quote_line_items ADD COLUMN IF NOT EXISTS prix_achat_ht numeric(12,2);
-- ALTER TABLE quote_line_items ADD COLUMN IF NOT EXISTS fournisseur text;

-- Coût horaire employé
ALTER TABLE IF EXISTS employes
  ADD COLUMN IF NOT EXISTS cout_horaire_interne numeric(10,2);

-- Pointages heures chantier
CREATE TABLE IF NOT EXISTS chantier_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chantier_id text NOT NULL,
  employe_id text NOT NULL,
  date date NOT NULL,
  heure_debut time NOT NULL,
  heure_fin time NOT NULL,
  pause_minutes integer NOT NULL DEFAULT 0,
  type_tache text NOT NULL DEFAULT 'autre',
  type_tache_personnalise text,
  commentaire text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chantier_time_entries_user_chantier
  ON chantier_time_entries (user_id, chantier_id);

CREATE INDEX IF NOT EXISTS idx_chantier_time_entries_user_date
  ON chantier_time_entries (user_id, date DESC);

-- Snapshot rentabilité chantier (recalculable ; utile pour historique / IA)
CREATE TABLE IF NOT EXISTS chantier_profitability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chantier_id text NOT NULL,
  devis_id text,
  prix_vente_ht numeric(12,2) NOT NULL DEFAULT 0,
  planned_material_cost numeric(12,2) NOT NULL DEFAULT 0,
  actual_material_cost numeric(12,2) NOT NULL DEFAULT 0,
  planned_labor_cost numeric(12,2) NOT NULL DEFAULT 0,
  actual_labor_cost numeric(12,2) NOT NULL DEFAULT 0,
  planned_hours numeric(10,2) NOT NULL DEFAULT 0,
  actual_hours numeric(10,2) NOT NULL DEFAULT 0,
  planned_margin numeric(12,2) NOT NULL DEFAULT 0,
  real_margin numeric(12,2) NOT NULL DEFAULT 0,
  real_margin_rate numeric(8,2) NOT NULL DEFAULT 0,
  chantier_type text,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chantier_profitability_user_chantier
  ON chantier_profitability (user_id, chantier_id, computed_at DESC);

-- RLS (à activer quand les tables seront branchées)
-- ALTER TABLE chantier_time_entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chantier_profitability ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE chantier_time_entries IS 'Pointages heures par chantier — module Pilotage Batimum';
COMMENT ON TABLE chantier_profitability IS 'Snapshots rentabilité chantier — module Pilotage Batimum';
