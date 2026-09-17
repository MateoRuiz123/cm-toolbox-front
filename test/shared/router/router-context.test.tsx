import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { RouterProvider, Link } from '../../../src/shared/router/router-context'
import { useRouter } from '../../../src/shared/router/use-router'

describe('Router Context', () => {
  it('arroja un error si useRouter se usa fuera de RouterProvider', () => {
    const ComponenteInvalido = () => {
      useRouter()
      return null
    }

    expect(() => renderToString(<ComponenteInvalido />)).toThrow(
      'useRouter debe ser utilizado dentro de un RouterProvider',
    )
  })

  it('renderiza con initialPath correctamente', () => {
    const ComponenteRuta = () => {
      const { path } = useRouter()
      return <div>Ruta: {path}</div>
    }

    const html = renderToString(
      <RouterProvider initialPath="/diagnostico">
        <ComponenteRuta />
      </RouterProvider>,
    )

    expect(html).toContain('/diagnostico')
  })

  it('renderiza el componente Link con sus atributos', () => {
    const html = renderToString(
      <RouterProvider initialPath="/">
        <Link href="/diagnostico" className="clase-test">
          Ir a diagnóstico
        </Link>
      </RouterProvider>,
    )

    expect(html).toContain('href="/diagnostico"')
    expect(html).toContain('clase-test')
    expect(html).toContain('Ir a diagnóstico')
  })
})
