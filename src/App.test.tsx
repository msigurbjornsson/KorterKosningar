import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the Reykjavik election overview and sections', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Korter í kosningar' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Fylgisrennur flokka' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Næst á lista hjá hverjum flokki',
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
      name: 'Næst á lista hjá hverjum flokki',
    })

    expect(within(nextInTable).getByText('F - Flokkur fólksins')).toBeInTheDocument()
    expect(within(nextInTable).getByText('FF númer 1')).toBeInTheDocument()
    expect(within(nextInTable).getByText('O - Okkar borg')).toBeInTheDocument()
    expect(
      within(nextInTable).getByText('Sigfús Aðalsteinsson, leikskólakennari'),
    ).toBeInTheDocument()
  })

  it('shows all candidate lists on a separate page and highlights the next person with needed share', () => {
    window.location.hash = ''
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Framboðslistar' }),
    )

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Allir frambjóðendur eftir flokki',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('B - Framsóknarflokkurinn')).toBeInTheDocument()
    expect(screen.getByText('Magnea Gná Jóhannsdóttir, borgarfulltrúi')).toBeInTheDocument()
    expect(screen.getByText('Vantar 2,97%')).toBeInTheDocument()
    expect(screen.getByText('FF númer 1')).toBeInTheDocument()
  })
})
