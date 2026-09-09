/**
 * Almacenamiento seguro con fallback en memoria.
 * Protege contra excepciones causadas por navegación privada, iframes sin permisos o cuotas excedidas.
 */
class MemoryStorage {
  private readonly store = new Map<string, string>()

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

type TipoAlmacenamiento = 'local' | 'session'

interface AlmacenamientoSeguro {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const resolverStorageNativo = (tipo: TipoAlmacenamiento): Storage | null => {
  try {
    const storage =
      tipo === 'local' ? globalThis.localStorage : globalThis.sessionStorage
    return typeof storage !== 'undefined' ? storage : null
  } catch {
    return null
  }
}

const crearAlmacenamientoSeguro = (
  tipo: TipoAlmacenamiento,
): AlmacenamientoSeguro => {
  const memoryFallback = new MemoryStorage()

  return {
    getItem(key) {
      try {
        const storage = resolverStorageNativo(tipo)
        if (storage) {
          return storage.getItem(key)
        }
      } catch {
        // Ignorar fallo de acceso al almacenamiento del navegador
      }
      return memoryFallback.getItem(key)
    },

    setItem(key, value) {
      try {
        const storage = resolverStorageNativo(tipo)
        if (storage) {
          storage.setItem(key, value)
          return
        }
      } catch {
        // Ignorar fallo de escritura en el almacenamiento del navegador
      }
      memoryFallback.setItem(key, value)
    },

    removeItem(key) {
      try {
        const storage = resolverStorageNativo(tipo)
        if (storage) {
          storage.removeItem(key)
          return
        }
      } catch {
        // Ignorar fallo de eliminación en el almacenamiento del navegador
      }
      memoryFallback.removeItem(key)
    },
  }
}

export const safeStorage = crearAlmacenamientoSeguro('local')

export const safeSessionStorage = crearAlmacenamientoSeguro('session')
