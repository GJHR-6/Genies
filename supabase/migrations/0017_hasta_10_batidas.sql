-- =====================================================================
-- Hasta 10 batidas en temporada alta (3 nov 2026)
--
-- El reparto de las pasteleras sigue en T1–T4; en el cuadro completo se
-- pueden escribir a mano DEC / PROD hasta la batida 10.
-- =====================================================================

begin;

alter table batidas_ajuste drop constraint batidas_ajuste_tanda_check;
alter table batidas_ajuste
  add constraint batidas_ajuste_tanda_check check (tanda between 1 and 10);

commit;
