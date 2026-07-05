-- Realtime para el dashboard admin (M4): el navegador se suscribe a los
-- cambios de captura y cierres del día. RLS aplica también a Realtime.
alter publication supabase_realtime add table movimientos_diarios;
alter publication supabase_realtime add table cierres_dia;
