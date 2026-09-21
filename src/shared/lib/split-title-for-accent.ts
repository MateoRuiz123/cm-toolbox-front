/** Divide un título en prefijo + última palabra para acento wave (p. ej. errores de auth dinámicos). */
export const splitTitleForAccent = (
  titulo: string,
): { before: string; accent: string; after: string } => {
  const idx = titulo.lastIndexOf(' ')
  if (idx <= 0) {
    return { before: '', accent: titulo, after: '' }
  }
  return {
    before: titulo.slice(0, idx + 1),
    accent: titulo.slice(idx + 1),
    after: '',
  }
}
