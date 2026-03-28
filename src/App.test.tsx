import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the Reykjavik election overview and sections', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Reykjavík' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Renna fyrir hvern flokk' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Næsti á lista hjá hverjum flokki',
      }),
    ).toBeInTheDocument()
  })

  it('recalculates seats when a slider changes and resets to the workbook baseline', () => {
    render(<App />)

    const pirateSeats = screen.getByTestId('party-seat-count-p')
    const pirateSlider = screen.getByRole('slider', { name: 'P - Píratar' })

    expect(pirateSeats).toHaveTextContent('0 sæti')

    fireEvent.change(pirateSlider, { target: { value: '120' } })

    expect(pirateSeats).not.toHaveTextContent('0 sæti')

    fireEvent.click(
      screen.getByRole('button', { name: 'Endurstilla á grunnspá' }),
    )

    expect(pirateSeats).toHaveTextContent('0 sæti')
  })

  it('keeps zero-seat parties visible in the per-party next-in table', () => {
    render(<App />)

    const nextInTable = screen.getByRole('table', {
      name: 'Næsti á lista hjá hverjum flokki',
    })

    expect(within(nextInTable).getByText('F - Flokkur fólksins')).toBeInTheDocument()
    expect(within(nextInTable).getByText('FF númer 1')).toBeInTheDocument()
    expect(within(nextInTable).getByText('O - Okkar borg')).toBeInTheDocument()
    expect(
      within(nextInTable).getByText('Sigfús Aðalsteinsson, leikskólakennari'),
    ).toBeInTheDocument()
  })
})
