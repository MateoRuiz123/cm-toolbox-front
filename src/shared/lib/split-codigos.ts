export const splitCodigos = (raw: string): string[] => {
  const codigos = raw
    .split(/[\s,;]+/)
    .map((codigo) => codigo.trim())
    .filter(Boolean)

  return [...new Set(codigos)]
}

export const parseDespachos = (
  raw: string,
): { values: number[]; error: null } | { values: []; error: string } => {
  const codigos = splitCodigos(raw)
  const invalido = codigos.find((codigo) => !/^\d+$/.test(codigo))

  if (invalido) {
    return { values: [], error: `El despacho “${invalido}” debe contener solo números.` }
  }

  const values = codigos.map(Number)
  const fueraDeRango = values.find((codigo) => !Number.isSafeInteger(codigo) || codigo <= 0)

  if (fueraDeRango !== undefined) {
    return { values: [], error: `El despacho “${fueraDeRango}” no es un número válido.` }
  }

  return { values, error: null }
}
