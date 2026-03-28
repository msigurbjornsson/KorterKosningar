import {
  startTransition,
  useEffect,
  useState,
  type CSSProperties,
} from 'react'
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

const municipality = reykjavikMunicipality
const defaultVoteShares = buildDefaultVoteShares(municipality)
const pageHashToView = {
  '#listar': 'lists',
  '#likan': 'model',
} as const

type AppPage = 'model' | 'lists'

function getPageFromHash(): AppPage {
  const hash = window.location.hash as keyof typeof pageHashToView
  return pageHashToView[hash] ?? 'model'
}

function formatShare(share: number, digits: 'slider' | 'table' = 'slider') {
  const formatter = digits === 'slider' ? sliderFormatter : tableFormatter
  return `${formatter.format(share * 100)}%`
}

function formatSeats(count: number) {
  return `${count} sæti`
}

function splitCandidateLabel(candidateName: string) {
  const [name, ...rest] = candidateName.split(',')

  return {
    name: name.trim(),
    role: rest.join(',').trim() || null,
  }
}

function App() {
  const [page, setPage] = useState<AppPage>(() => getPageFromHash())
  const [voteShares, setVoteShares] =
    useState<Record<string, number>>(defaultVoteShares)

  useEffect(() => {
    document.title = 'Korter í kosningar'
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      setPage(getPageFromHash())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const election = calculateElection(municipality, voteShares)
  const leadingParty = municipality.parties.reduce((leader, party) =>
    voteShares[party.id] > voteShares[leader.id] ? party : leader,
  )
  const nextSeat = election.nextInQueue[0]

  const navigateTo = (nextPage: AppPage) => {
    setPage(nextPage)
    const nextHash = nextPage === 'lists' ? '#listar' : '#likan'

    if (window.location.hash === nextHash) {
      return
    }

    window.location.hash = nextHash
  }

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
          <p className="eyebrow">Sveitarstjórnarkosningar í Reykjavík</p>
          <h1>Korter í kosningar</h1>
          <p className="hero-panel__lede">
            Færðu til fylgi flokkanna og sjáðu samstundis hverjir fá 23 sæti í
            borgarstjórn Reykjavíkur, hver er næst inn og hversu mikið fylgi
            vantar til að ná næsta sæti.
          </p>
        </div>

        <div className="hero-panel__actions">
          <nav className="page-nav" aria-label="Síðuleiðsögn">
            <button
              className={`page-nav__button${page === 'model' ? ' is-active' : ''}`}
              type="button"
              onClick={() => navigateTo('model')}
            >
              Kosningalíkan
            </button>
            <button
              className={`page-nav__button${page === 'lists' ? ' is-active' : ''}`}
              type="button"
              onClick={() => navigateTo('lists')}
            >
              Framboðslistar
            </button>
          </nav>
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
          <span className="metric-card__label">Viðmið 23. sætis</span>
          <strong className="metric-card__value">
            {formatShare(election.winningThreshold, 'table')}
          </strong>
          <span className="metric-card__hint">
            Fylgi sem þarf til að ná síðasta sætinu
          </span>
        </article>
        <article className="metric-card">
          <span className="metric-card__label">Næst inn</span>
          <strong className="metric-card__value">{nextSeat?.partyCode ?? '—'}</strong>
          <span className="metric-card__hint">
            {nextSeat?.candidateName ?? 'Enginn á lista'}
          </span>
        </article>
      </section>

      {page === 'model' ? (
        <>
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="section-heading__eyebrow">Fylgi</p>
                <h2>Fylgisrennur flokka</h2>
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
                        Næst á lista:{' '}
                        <strong>
                          {nextInParty?.nextCandidateName ?? 'Enginn á lista'}
                        </strong>
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
              {election.electedSeats.map((seat) => {
                const candidateLabel = splitCandidateLabel(seat.candidateName)

                return (
                  <li
                    key={`${seat.partyId}-${seat.rank}`}
                    className="seat-card"
                    style={{ '--party-accent': seat.partyColor } as CSSProperties}
                  >
                    <div className="seat-card__header">
                      <span>Sæti {seat.rank}</span>
                      <span>{seat.partyCode}</span>
                    </div>
                    <div className="seat-card__body">
                      <strong>{candidateLabel.name}</strong>
                      {candidateLabel.role ? (
                        <span className="seat-card__role">{candidateLabel.role}</span>
                      ) : null}
                      <span>{seat.partyName}</span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>

          <section className="panel panel--two-up">
            <div className="table-panel">
              <div className="section-heading">
                <div>
                  <p className="section-heading__eyebrow">Næstu sæti</p>
                  <h2>Röð næst inn</h2>
                </div>
                <span className="section-heading__meta">
                  Sæti {municipality.seatCount + 1} til{' '}
                  {municipality.seatCount + election.nextInQueue.length}
                </span>
              </div>

              <div className="table-shell">
                <table aria-label="Röð næst inn">
                  <thead>
                    <tr>
                      <th>Sæti</th>
                      <th>Flokkur</th>
                      <th>Nafn</th>
                      <th>% vantar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {election.nextInQueue.map((seat) => (
                      <tr key={`${seat.partyId}-${seat.rank}`}>
                        <td>{seat.rank}</td>
                        <td>
                          <span
                            className="table-party"
                            style={
                              {
                                '--party-accent': seat.partyColor,
                              } as CSSProperties
                            }
                          >
                            {seat.partyCode}
                          </span>
                        </td>
                        <td>{seat.candidateName}</td>
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
              <div className="table-shell">
                <table aria-label="Næst á lista hjá hverjum flokki">
                  <thead>
                    <tr>
                      <th>Flokkur</th>
                      <th>Sæti núna</th>
                      <th>Næsti á lista</th>
                      <th>Deilitala</th>
                    </tr>
                  </thead>
                  <tbody>
                    {election.partyNextIn.map((row) => (
                      <tr key={row.partyId}>
                        <td>
                          <span
                            className="table-party"
                            style={
                              {
                                '--party-accent': row.partyColor,
                              } as CSSProperties
                            }
                          >
                            {row.partyCode}
                          </span>{' '}
                          {row.partyName}
                        </td>
                        <td>{row.currentSeats}</td>
                        <td>{row.nextCandidateName ?? 'Enginn á lista'}</td>
                        <td>{row.nextDivisor ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-shell">
                <table aria-label="Vantar í næsta sæti hjá hverjum flokki">
                  <thead>
                    <tr>
                      <th>Flokkur</th>
                      <th>Næsti á lista</th>
                      <th>Vantar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {election.partyNextIn.map((row) => (
                      <tr key={`${row.partyId}-needed`}>
                        <td>
                          <span
                            className="table-party"
                            style={
                              {
                                '--party-accent': row.partyColor,
                              } as CSSProperties
                            }
                          >
                            {row.partyCode}
                          </span>{' '}
                          {row.partyName}
                        </td>
                        <td>{row.nextCandidateName ?? 'Enginn á lista'}</td>
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
        </>
      ) : (
        <section className="panel panel--candidate-lists">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">Framboðslistar</p>
              <h2>Allir frambjóðendur eftir flokki</h2>
            </div>
            <span className="section-heading__meta candidate-lists-heading__meta">
              Sá sem er næst á lista sýnir hversu mikið fylgi vantar í næsta sæti
            </span>
          </div>

          <div className="candidate-lists-grid">
            {municipality.parties.map((party) => {
              const seatsWon = election.seatCounts[party.id]
              const nextInParty =
                election.partyNextIn.find((row) => row.partyId === party.id) ??
                null

              return (
                <article
                  key={`list-${party.id}`}
                  className="candidate-list-card"
                  style={{ '--party-accent': party.color } as CSSProperties}
                >
                  <div className="candidate-list-card__header">
                    <div className="candidate-list-card__title">
                      <span className="party-badge">{party.code}</span>
                      <div className="candidate-list-card__details">
                        <h3>{party.fullName}</h3>
                        <p>
                          {formatSeats(seatsWon)} og {party.candidates.length} nöfn á
                          lista
                        </p>
                      </div>
                    </div>
                    <span className="candidate-list-card__share">
                      {formatShare(voteShares[party.id])}
                    </span>
                  </div>

                  <ol className="candidate-list">
                    {party.candidates.map((candidateName, index) => {
                      const rank = index + 1
                      const isElected = index < seatsWon
                      const isNext =
                        index === seatsWon &&
                        nextInParty?.nextCandidateName != null
                      const candidateLabel = splitCandidateLabel(candidateName)

                      return (
                        <li
                          key={`${party.id}-${rank}`}
                          className={`candidate-list__item${
                            isElected ? ' is-elected' : ''
                          }${isNext ? ' is-next' : ''}`}
                        >
                          <div className="candidate-list__main">
                            <span className="candidate-list__rank">{rank}</span>
                            <div className="candidate-list__text">
                              <strong>{candidateLabel.name}</strong>
                              {candidateLabel.role ? (
                                <span className="candidate-list__role">
                                  {candidateLabel.role}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="candidate-list__meta">
                            {isNext && nextInParty?.neededShare != null ? (
                              <span className="candidate-list__needed">
                                Vantar {formatShare(nextInParty.neededShare, 'table')}
                              </span>
                            ) : null}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}

export default App
