import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import {
  SmoothLinkScramble,
  SmoothTitleAccent,
} from '@/shared/ui/smoothui'

describe('SmoothTitleAccent', () => {
  it('expone el título completo como heading accesible', () => {
    render(
      <SmoothTitleAccent
        accessibleTitle="Diagnóstico de migración"
        before="Diagnóstico de "
        accent="migración"
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Diagnóstico de migración' }),
    ).toBeInTheDocument()
  })

  it('marca el fragmento visual como aria-hidden', () => {
    const { container } = render(
      <SmoothTitleAccent accessibleTitle="Test" accent="Test" />,
    )

    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy()
  })
})

describe('SmoothLinkScramble', () => {
  it('expone accessibleLabel en sr-only', () => {
    render(
      <MemoryRouter>
        <SmoothLinkScramble
          to="/diagnostico"
          accessibleLabel="Abrir Diagnóstico"
          scrambleText="Diagnóstico"
          before="Abrir "
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Abrir Diagnóstico')).toHaveClass('sr-only')
  })
})
