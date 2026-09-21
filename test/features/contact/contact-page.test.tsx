import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ContactPage } from '../../../src/features/contact/contact-page'
import { ThankYouPage } from '../../../src/features/feedback/thank-you-page'

const renderContactFlow = () =>
  render(
    <MemoryRouter initialEntries={['/contacto']}>
      <Routes>
        <Route path="/contacto" element={<ContactPage />} />
        <Route path="/gracias" element={<ThankYouPage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('ContactPage', () => {
  it('muestra errores de validación cuando el formulario está vacío', async () => {
    const user = userEvent.setup()
    renderContactFlow()

    await user.click(screen.getByRole('button', { name: /enviar mensaje/i }))

    expect(await screen.findByText('El nombre es requerido.')).toBeInTheDocument()
    expect(screen.getByText('El correo electrónico es requerido.')).toBeInTheDocument()
    expect(screen.getByText('El mensaje no puede estar vacío.')).toBeInTheDocument()
  })

  it('navega a /gracias tras un envío válido', async () => {
    const user = userEvent.setup()
    renderContactFlow()

    await user.type(screen.getByLabelText(/nombre completo/i), 'Ana Coordinadora')
    await user.type(screen.getByLabelText(/correo corporativo/i), 'ana@coordinadora.com')
    await user.type(
      screen.getByLabelText(/mensaje o detalle del caso/i),
      'Detalle de prueba con más de diez caracteres.',
    )
    await user.click(screen.getByRole('button', { name: /enviar mensaje/i }))

    expect(
      await screen.findByText('¡Mensaje Enviado con Éxito!', {}, { timeout: 2000 }),
    ).toBeInTheDocument()
  })
})
