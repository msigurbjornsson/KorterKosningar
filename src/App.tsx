import { startTransition, useState, type CSSProperties } from 'react'
import './App.css'
import { reykjavikMunicipality } from './data/reykjavik'
import {
  buildDefaultVoteShares,
  calculateElection,
  normalizeVoteShares,
} from './lib/dhondt'

const sliderFormatter = new Intl.NumberFormat('is-IS', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const tableFormatter = new Intl.NumberFormat('is-IS', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const quotientFormatter = new Intl.NumberFormat('is-IS', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})

const municipality = reykjavikMunicipality
const defaultVoteShares = buildDefaultVoteShares(municipality)

function formatShare(share: number, digits: 'slider' | 'table' = 'slider') {
  const formatter = digits === 'slider' ? sliderFormatter : tableFormatter
  return `${formatter.format(share * 100)}%`
}

function formatQuotient(value: number) {
  return quotientFormatter.format(value * 100)
}

function formatSeats(count: number) {
  return `${count} sæti`
}

function App() {
  const [voteShares, setVoteShares] =
    useState<Record<string, number>>(defaultVoteShares)

  const election = calculateElection(municipality, voteShares)
  const leadingParty = municipality.parties.reduce((leader, party) =>
    voteShares[party.id] > voteShares[leader.id] ? party : leader,
  )
  const nextSeat = election.nextInQueue[0]

  const handleSliderChange = (partyId: string, nextValue: string) => {
    const nextShare = Number(nextValue) / 1000

    startTransition(() => {
      setVoteShares((current) =>
        normalizeVoteShares(municipality, current, partyId, nextShare),
      )
    })
  }

  const handleReset = () => {
    startTransition(() => {
      setVoteShares(buildDefaultVoteShares(municipality))
    })
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-panel__content">
          <p className="eyebrow">Sveitarstjórnarkosningar</p>
          <h1>{municipality.name}</h1>
          <p className="hero-panel__lede">
            Færðu til fylgi flokkanna og sjáðu samstundis hver fær 23
            borgarfulltrúasæti, hver er næstur inn og hversu mikið fylgi vantar
            í næsta sæti.
          </p>
        </div>

        <div className="hero-panel__actions">
          <button className="ghost-button" type="button" onClick={handleReset}>
            Endurstilla á grunnspá
          </button>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Yfirlit">
        <article className="metric-card">
          <span className="metric-card__label">Sæti í boði</span>
          <strong className="metric-card__value">{municipality.seatCount}</strong>
          <span className="metric-card__hint">Borgarfulltrúar í Reykjavík</span>
        </article>
        <article className="metric-card">
          <span className="metric-card__label">Leiðandi flokkur</span>
          <strong className="metric-card__value">{leadingParty.code}</strong>
          <span className="metric-card__hint">{leadingParty.name}</span>
        </article>
        <article className="metric-card">
          <span className="metric-card__label">Skurðgildi 23. sætis</span>
          <strong className="metric-card__value">
            {formatShare(election.winningThreshold, 'table')}
          </strong>
          <span className="metric-card__hint">Kvóti síðasta kjörna sætis</span>
        </article>
        <article className="metric-card">
          <span className="metric-card__label">Næstur inn</span>
          <strong className="metric-card__value">{nextSeat?.partyCode ?? '—'}</strong>
          <span className="metric-card__hint">
            {nextSeat?.candidateName ?? 'Enginn á lista'}
          </span>
        </article>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">Fylgi</p>
            <h2>Renna fyrir hvern flokk</h2>
          </div>
          <div className="total-pill" aria-live="polite">
            Samtals {formatShare(election.totalShare)}
          </div>
        </div>

        <div className="party-grid">
          {municipality.parties.map((party) => {
            const seatCount = election.seatCounts[party.id]
            const nextInParty =
              election.partyNextIn.find((row) => row.partyId === party.id) ??
              null
            const style = { '--party-accent': party.color } as CSSProperties

            return (
              <article
                key={party.id}
                className="party-card"
                style={style}
                data-testid={`party-card-${party.id}`}
              >
                <div className="party-card__topline">
                  <span className="party-badge">{party.code}</span>
                  <span className="party-card__name">{party.fullName}</span>
                </div>

                <div className="party-card__numbers">
                  <strong>{formatShare(voteShares[party.id])}</strong>
                  <span data-testid={`party-seat-count-${party.id}`}>
                    {formatSeats(seatCount)}
                  </span>
                </div>

                <label className="sr-only" htmlFor={`slider-${party.id}`}>
                  {party.fullName}
                </label>
                <input
                  id={`slider-${party.id}`}
                  className="party-card__slider"
                  type="range"
                  min="0"
                  max="1000"
                  step="1"
                  value={Math.round(voteShares[party.id] * 1000)}
                  onChange={(event) =>
                    handleSliderChange(party.id, event.currentTarget.value)
                  }
                  aria-label={party.fullName}
                />

                <div className="party-card__scale" aria-hidden="true">
                  <span>0%</span>
                  <span>100%</span>
                </div>

                <div className="party-card__footer">
                  <span>
                    Næsti á lista:{' '}
                    <strong>{nextInParty?.nextCandidateName ?? 'Enginn á lista'}</strong>
                  </span>
                  <span>
                    Vantar:{' '}
                    <strong>
                      {nextInParty?.neededShare == null
                        ? '—'
                        : formatShare(nextInParty.neededShare, 'table')}
                    </strong>
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="panel panel--embed">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">Hlé</p>
            <h2>Spotify</h2>
          </div>
        </div>

        <iframe
          data-testid="embed-iframe"
          className="spotify-embed"
          src="https://open.spotify.com/embed/show/5ucrw8yLMxv2FGM0benN0d?utm_source=generator"
          width="100%"
          height="152"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Spotify embed"
        />
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">Úrslit</p>
            <h2>Kjörnir borgarfulltrúar</h2>
          </div>
          <span className="section-heading__meta">
            {election.electedSeats.length} af {municipality.seatCount} sætum
          </span>
        </div>

        <ol className="seat-grid">
          {election.electedSeats.map((seat) => (
            <li
              key={`${seat.partyId}-${seat.rank}`}
              className="seat-card"
              style={{ '--party-accent': seat.partyColor } as CSSProperties}
            >
              <div className="seat-card__header">
                <span>Sæti {seat.rank}</span>
                <span>{seat.partyCode}</span>
              </div>
              <strong>{seat.candidateName}</strong>
              <span>{seat.partyName}</span>
              <span className="seat-card__quotient">
                Kvóti {formatQuotient(seat.quotient)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel panel--two-up">
        <div className="table-panel">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">Næstu sæti</p>
              <h2>Almenn röð næst inn</h2>
            </div>
            <span className="section-heading__meta">
              Sæti {municipality.seatCount + 1} til{' '}
              {municipality.seatCount + election.nextInQueue.length}
            </span>
          </div>

          <div className="table-shell">
            <table aria-label="Almenn röð næst inn">
              <thead>
                <tr>
                  <th>Sæti</th>
                  <th>Flokkur</th>
                  <th>Nafn</th>
                  <th>Deilitala</th>
                  <th>Kvóti</th>
                  <th>Vantar</th>
                </tr>
              </thead>
              <tbody>
                {election.nextInQueue.map((seat) => (
                  <tr key={`${seat.partyId}-${seat.rank}`}>
                    <td>{seat.rank}</td>
                    <td>
                      <span
                        className="table-party"
                        style={{ '--party-accent': seat.partyColor } as CSSProperties}
                      >
                        {seat.partyCode}
                      </span>
                    </td>
                    <td>{seat.candidateName}</td>
                    <td>{seat.divisor}</td>
                    <td>{formatQuotient(seat.quotient)}</td>
                    <td>
                      {seat.neededShare === null
                        ? '—'
                        : formatShare(seat.neededShare, 'table')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-panel">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">Flokkar</p>
              <h2>Næsti á lista hjá hverjum flokki</h2>
            </div>
            <span className="section-heading__meta">Með vöntun í næsta sæti</span>
          </div>

          <div className="table-shell">
            <table aria-label="Næsti á lista hjá hverjum flokki">
              <thead>
                <tr>
                  <th>Flokkur</th>
                  <th>Sæti núna</th>
                  <th>Næsti á lista</th>
                  <th>Deilitala</th>
                  <th>Vantar</th>
                </tr>
              </thead>
              <tbody>
                {election.partyNextIn.map((row) => (
                  <tr key={row.partyId}>
                    <td>
                      <span
                        className="table-party"
                        style={{ '--party-accent': row.partyColor } as CSSProperties}
                      >
                        {row.partyCode}
                      </span>{' '}
                      {row.partyName}
                    </td>
                    <td>{row.currentSeats}</td>
                    <td>{row.nextCandidateName ?? 'Enginn á lista'}</td>
                    <td>{row.nextDivisor ?? '—'}</td>
                    <td>
                      {row.neededShare === null
                        ? '—'
                        : formatShare(row.neededShare, 'table')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
