import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the Reykjavik election overview and sections', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Korter í kosningar' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Fylgi flokkanna' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('table', {
        name: 'Röð næst inn',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reykjavík' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Kópavogur' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Garðabær' })).toBeDisabled()
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

  it('shows direct percentage fields when Reitir is checked', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Reitir' }))

    expect(
      screen.getByRole('spinbutton', { name: 'P - Píratar prósentur' }),
    ).toBeInTheDocument()
  })

  it('can sort parties by current size', () => {
    const { container } = render(<App />)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Raða eftir stærð' }))

    const partyCards = [...container.querySelectorAll('[data-testid^="party-card-"]')]
    const orderedIds = partyCards.map((card) => card.getAttribute('data-testid'))

    expect(orderedIds.slice(0, 3)).toEqual([
      'party-card-d',
      'party-card-s',
      'party-card-m',
    ])
  })

  it('keeps zero-seat parties visible on the candidate-lists page', () => {
    window.location.hash = '#listar'
    render(<App />)

    expect(screen.getByText('F - Flokkur fólksins')).toBeInTheDocument()
    expect(screen.getByText('O - Okkar borg')).toBeInTheDocument()
    expect(screen.getByText('Sigfús Aðalsteinsson')).toBeInTheDocument()
    expect(screen.getAllByText('leikskólakennari').length).toBeGreaterThan(0)
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
    expect(screen.getByText('Magnea Gná Jóhannsdóttir')).toBeInTheDocument()
    expect(screen.getAllByText('borgarfulltrúi').length).toBeGreaterThan(0)
    expect(screen.getByText('Vantar 2,97%')).toBeInTheDocument()
    expect(screen.getAllByText('Kristinn Jón Ólafsson').length).toBeGreaterThan(0)
    expect(screen.getAllByText('varaborgarfulltrúi').length).toBeGreaterThan(0)
  })
})
