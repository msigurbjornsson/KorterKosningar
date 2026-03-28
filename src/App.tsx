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

const populationFormatter = new Intl.NumberFormat('is-IS')

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

function formatShareInputValue(share: number) {
  return sliderFormatter.format(share * 100)
}

function formatSeats(count: number) {
  return `${count} sæti`
}

function formatPopulation(population: number) {
  return populationFormatter.format(population)
}

function isRoleStartToken(token: string) {
  if (token.length === 0) {
    return false
  }

  return token[0] === token[0].toLowerCase()
}

function splitCandidateLabel(candidateName: string) {
  const [commaName, ...commaRest] = candidateName.split(',')

  if (commaRest.length > 0) {
    return {
      name: commaName.trim(),
      role: commaRest.join(',').trim() || null,
    }
  }

  const tokens = candidateName.trim().split(/\s+/)
  const roleIndex = tokens.findIndex(
    (token, index) => index >= 2 && isRoleStartToken(token),
  )

  if (roleIndex > 0) {
    return {
      name: tokens.slice(0, roleIndex).join(' ').trim(),
      role: tokens.slice(roleIndex).join(' ').trim() || null,
    }
  }

  return {
    name: candidateName.trim(),
    role: null,
  }
}

function renderCandidateLabel(candidateName: string, roleClassName: string) {
  const candidateLabel = splitCandidateLabel(candidateName)

  return (
    <>
      <strong>{candidateLabel.name}</strong>
      {candidateLabel.role ? (
        <span className={roleClassName}>{candidateLabel.role}</span>
      ) : null}
    </>
  )
}

function App() {
  const [page, setPage] = useState<AppPage>(() => getPageFromHash())
  const [voteShares, setVoteShares] =
    useState<Record<string, number>>(defaultVoteShares)
  const [showShareFields, setShowShareFields] = useState(false)
  const [sortPartiesBySize, setSortPartiesBySize] = useState(false)
  const [shareInputs, setShareInputs] =
    useState<Record<string, string>>(() =>
      municipality.parties.reduce<Record<string, string>>((accumulator, party) => {
        accumulator[party.id] = formatShareInputValue(defaultVoteShares[party.id] ?? 0)
        return accumulator
      }, {}),
    )

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

  useEffect(() => {
    setShareInputs(
      municipality.parties.reduce<Record<string, string>>((accumulator, party) => {
        accumulator[party.id] = formatShareInputValue(voteShares[party.id] ?? 0)
        return accumulator
      }, {}),
    )
  }, [voteShares])

  const election = calculateElection(municipality, voteShares)
  const leadingParty = municipality.parties.reduce((leader, party) =>
    voteShares[party.id] > voteShares[leader.id] ? party : leader,
  )
  const sortedParties = [...municipality.parties].sort((left, right) => {
    if (!sortPartiesBySize) {
      return municipality.partyOrder.indexOf(left.id) - municipality.partyOrder.indexOf(right.id)
    }

    const shareDifference = (voteShares[right.id] ?? 0) - (voteShares[left.id] ?? 0)

    if (shareDifference !== 0) {
      return shareDifference
    }

    const seatDifference =
      (election.seatCounts[right.id] ?? 0) - (election.seatCounts[left.id] ?? 0)

    if (seatDifference !== 0) {
      return seatDifference
    }

    return municipality.partyOrder.indexOf(left.id) - municipality.partyOrder.indexOf(right.id)
  })

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

  const handleShareInputChange = (partyId: string, nextValue: string) => {
    setShareInputs((current) => ({
      ...current,
      [partyId]: nextValue,
    }))

    const normalizedValue = Number(nextValue.replace(',', '.'))

    if (!Number.isFinite(normalizedValue)) {
      return
    }

    const nextShare = normalizedValue / 100

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
          <div className="hero-panel__controls">
            <label className="toggle-pill toggle-pill--hero">
              <input
                checked={sortPartiesBySize}
                type="checkbox"
                onChange={(event) => setSortPartiesBySize(event.currentTarget.checked)}
              />
              <span>Raða eftir stærð</span>
            </label>
            <button className="ghost-button ghost-button--hero" type="button" onClick={handleReset}>
              Endurstilla á grunnspá
            </button>
          </div>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Yfirlit">
        <article className="metric-card">
          <span className="metric-card__label">Sæti í boði</span>
          <strong className="metric-card__value">{municipality.seatCount}</strong>
          <span className="metric-card__hint">Borgarfulltrúar í Reykjavík</span>
        </article>
        <article className="metric-card">
          <span className="metric-card__label">Stærsti flokkur</span>
          <strong className="metric-card__value">{leadingParty.code}</strong>
          <span className="metric-card__hint">{leadingParty.name}</span>
        </article>
        <article className="metric-card">
          <span className="metric-card__label">Íbúafjöldi</span>
          <strong className="metric-card__value">
            {municipality.population == null
              ? '—'
              : formatPopulation(municipality.population)}
          </strong>
          <span className="metric-card__hint">
            {municipality.populationAsOf == null
              ? `Íbúar í ${municipality.name}`
              : `Íbúar ${municipality.populationAsOf}`}
          </span>
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
      </section>

      {page === 'model' ? (
        <>
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="section-heading__eyebrow">Fylgi</p>
                <h2>Fylgi flokkanna</h2>
              </div>
              <label className="toggle-pill">
                <input
                  checked={showShareFields}
                  type="checkbox"
                  onChange={(event) => setShowShareFields(event.currentTarget.checked)}
                />
                <span>Reitir</span>
              </label>
            </div>

            <div className="party-grid">
              {sortedParties.map((party) => {
                const seatCount = election.seatCounts[party.id]
                const nextInParty =
                  election.partyNextIn.find((row) => row.partyId === party.id) ??
                  null
                const nextCandidateLabel =
                  nextInParty?.nextCandidateName == null
                    ? null
                    : splitCandidateLabel(nextInParty.nextCandidateName)
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
                      <span className="party-card__name">{party.name}</span>
                    </div>

                    <div className="party-card__numbers">
                      <strong>{formatShare(voteShares[party.id])}</strong>
                      <span data-testid={`party-seat-count-${party.id}`}>
                        {formatSeats(seatCount)}
                      </span>
                    </div>

                    {showShareFields ? (
                      <label className="party-card__field">
                        <span className="party-card__footer-label">Fylgi í %</span>
                        <div className="party-card__field-input">
                          <input
                            inputMode="decimal"
                            max="100"
                            min="0"
                            step="0.1"
                            type="number"
                            value={shareInputs[party.id] ?? ''}
                            onChange={(event) =>
                              handleShareInputChange(
                                party.id,
                                event.currentTarget.value,
                              )
                            }
                            aria-label={`${party.name} prósentur`}
                          />
                          <span>%</span>
                        </div>
                      </label>
                    ) : null}

                    <label className="sr-only" htmlFor={`slider-${party.id}`}>
                      {party.name}
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
                      aria-label={party.name}
                    />

                    <div className="party-card__scale" aria-hidden="true">
                      <span>0%</span>
                      <span>100%</span>
                    </div>

                    <div className="party-card__footer">
                      <div className="party-card__next">
                        <span className="party-card__footer-label">Næst á lista</span>
                        <div className="party-card__candidate">
                          {nextCandidateLabel == null ? (
                            <strong>Enginn á lista</strong>
                          ) : (
                            <>
                              <strong>{nextCandidateLabel.name}</strong>
                              {nextCandidateLabel.role ? (
                                <span className="party-card__candidate-role">
                                  {nextCandidateLabel.role}
                                </span>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="party-card__need">
                        <span className="party-card__footer-label">Vantar</span>
                        <strong>
                          {nextInParty?.neededShare == null
                            ? '—'
                            : formatShare(nextInParty.neededShare, 'table')}
                        </strong>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="panel panel--embed">
            <div className="section-heading">
              <div>
                <p className="section-heading__eyebrow">Hlaðvarp</p>
                <h2>Korter í kosningar á Spotify</h2>
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
              title="Korter í kosningar á Spotify"
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

          <section className="panel">
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
                        <td>
                          <div className="table-candidate">
                            {renderCandidateLabel(seat.candidateName, 'table-candidate__role')}
                          </div>
                        </td>
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
            {sortedParties.map((party) => {
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
                        <h3>{party.name}</h3>
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
