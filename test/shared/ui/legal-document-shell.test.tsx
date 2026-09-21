import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { LegalDocumentShell } from '@/shared/ui/legal-document-shell'

describe('LegalDocumentShell', () => {
  it('expone el título accesible completo en el h1', () => {
    render(
      <MemoryRouter>
        <LegalDocumentShell
          badge={<span>Badge legal</span>}
          accessibleTitle="Términos y Condiciones de Uso"
          before="Términos y "
          accent="Condiciones"
          after=" de Uso"
          subtitle="Subtítulo institucional"
        >
          <p>Contenido legal</p>
        </LegalDocumentShell>
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Términos y Condiciones de Uso' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Contenido legal')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /volver al portal/i })).toBeInTheDocument()
  })
})
