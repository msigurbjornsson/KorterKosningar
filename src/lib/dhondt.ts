import type {
  AllocationResult,
  MunicipalityConfig,
  PartyNextIn,
  RankedSeat,
} from './types'

const SLIDER_SCALE = 1000

type ShareMap = Record<string, number>

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function shareToUnits(share: number) {
  return Math.round(share * SLIDER_SCALE)
}

function unitsToShare(units: number) {
  return units / SLIDER_SCALE
}

function distributeUnits(
  orderedIds: string[],
  basisById: Record<string, number>,
  targetTotal: number,
) {
  if (orderedIds.length === 0) {
    return {} as Record<string, number>
  }

  const basisTotal = orderedIds.reduce(
    (sum, id) => sum + (basisById[id] ?? 0),
    0,
  )

  const raw = orderedIds.map((id, index) => {
    const portion =
      basisTotal > 0
        ? ((basisById[id] ?? 0) / basisTotal) * targetTotal
        : targetTotal / orderedIds.length

    return {
      id,
      index,
      floor: Math.floor(portion),
      fraction: portion - Math.floor(portion),
    }
  })

  let remaining = targetTotal - raw.reduce((sum, item) => sum + item.floor, 0)

  raw
    .sort((left, right) => {
      if (right.fraction !== left.fraction) {
        return right.fraction - left.fraction
      }

      return left.index - right.index
    })
    .forEach((item) => {
      if (remaining <= 0) {
        return
      }

      item.floor += 1
      remaining -= 1
    })

  return raw.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.id] = item.floor
    return accumulator
  }, {})
}

export function buildDefaultVoteShares(
  municipality: MunicipalityConfig,
): Record<string, number> {
  return municipality.parties.reduce<Record<string, number>>((accumulator, party) => {
    accumulator[party.id] = party.defaultVoteShare
    return accumulator
  }, {})
}

export function normalizeVoteShares(
  municipality: MunicipalityConfig,
  currentShares: ShareMap,
  editedPartyId: string,
  nextEditedShare: number,
) {
  const clampedEditedUnits = shareToUnits(clamp(nextEditedShare, 0, 1))
  const remainingUnits = SLIDER_SCALE - clampedEditedUnits
  const otherParties = municipality.parties.filter((party) => party.id !== editedPartyId)

  const currentUnits = municipality.parties.reduce<Record<string, number>>(
    (accumulator, party) => {
      accumulator[party.id] = shareToUnits(currentShares[party.id] ?? 0)
      return accumulator
    },
    {},
  )

  const redistributedUnits = distributeUnits(
    otherParties.map((party) => party.id),
    currentUnits,
    remainingUnits,
  )

  return municipality.parties.reduce<Record<string, number>>((accumulator, party) => {
    accumulator[party.id] =
      party.id === editedPartyId
        ? unitsToShare(clampedEditedUnits)
        : unitsToShare(redistributedUnits[party.id] ?? 0)
    return accumulator
  }, {})
}

export function calculateElection(
  municipality: MunicipalityConfig,
  voteShares: ShareMap,
  nextSeatCount = 10,
): AllocationResult {
  const seatCount = municipality.seatCount
  const orderedPartyIds = municipality.partyOrder
  const partyIndex = new Map(orderedPartyIds.map((id, index) => [id, index]))
  const totalShare = municipality.parties.reduce(
    (sum, party) => sum + (voteShares[party.id] ?? 0),
    0,
  )

  const allQuotients = municipality.parties.flatMap((party) => {
    const share = voteShares[party.id] ?? 0

    return party.candidates.map((candidateName, index) => ({
      candidateName,
      divisor: index + 1,
      party,
      quotient: share / (index + 1),
      share,
    }))
  })

  allQuotients.sort((left, right) => {
    if (right.quotient !== left.quotient) {
      return right.quotient - left.quotient
    }

    if (right.share !== left.share) {
      return right.share - left.share
    }

    const leftIndex = partyIndex.get(left.party.id) ?? 0
    const rightIndex = partyIndex.get(right.party.id) ?? 0

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex
    }

    return left.divisor - right.divisor
  })

  const winningThreshold = allQuotients[Math.max(0, seatCount - 1)]?.quotient ?? 0
  const seatCounts = municipality.parties.reduce<Record<string, number>>(
    (accumulator, party) => {
      accumulator[party.id] = 0
      return accumulator
    },
    {},
  )

  const rankedSeats = allQuotients.map<RankedSeat>((entry, index) => {
    const isElected = index < seatCount

    if (isElected) {
      seatCounts[entry.party.id] += 1
    }

    return {
      rank: index + 1,
      partyId: entry.party.id,
      partyCode: entry.party.code,
      partyName: entry.party.fullName,
      partyColor: entry.party.color,
      candidateName: entry.candidateName,
      divisor: entry.divisor,
      quotient: entry.quotient,
      isElected,
      neededShare: isElected
        ? null
        : Math.max(0, winningThreshold * entry.divisor - entry.share),
    }
  })

  const electedSeats = rankedSeats.slice(0, seatCount)
  const nextInQueue = rankedSeats.slice(seatCount, seatCount + nextSeatCount)

  const partyNextIn = municipality.parties.map<PartyNextIn>((party) => {
    const currentSeats = seatCounts[party.id]
    const nextCandidateName = party.candidates[currentSeats] ?? null
    const nextDivisor = nextCandidateName ? currentSeats + 1 : null
    const share = voteShares[party.id] ?? 0

    return {
      partyId: party.id,
      partyCode: party.code,
      partyName: party.fullName,
      partyColor: party.color,
      currentSeats,
      nextCandidateName,
      nextDivisor,
      neededShare:
        nextDivisor === null
          ? null
          : Math.max(0, winningThreshold * nextDivisor - share),
    }
  })

  return {
    seatCount,
    totalShare,
    winningThreshold,
    electedSeats,
    rankedSeats,
    nextInQueue,
    seatCounts,
    partyNextIn,
  }
}

export function findPartyNextIn(
  partyNextIn: PartyNextIn[],
  partyId: string,
) {
  return partyNextIn.find((row) => row.partyId === partyId)
}

export function getPartyById(
  municipality: MunicipalityConfig,
  partyId: string,
) {
  return municipality.parties.find((party) => party.id === partyId)
}
