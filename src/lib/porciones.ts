/**
 * Porciones (pedido de la dueña, 17 nov 2026): solo las ve administración,
 * en el cuadro completo. No salen en las hojas de las pasteleras (cuadros
 * por área ni decoración): se cortan de los pasteles enteros.
 */
export function esPorcion(p: { nombre: string }): boolean {
  return /^porci[oó]n/i.test(p.nombre.trim());
}
