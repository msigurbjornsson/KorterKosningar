export interface PartyConfig {
  id: string
  code: string
  name: string
  fullName: string
  color: string
  defaultVoteShare: number
  candidates: string[]
}

export interface MunicipalityConfig {
  id: string
  name: string
  seatCount: number
  partyOrder: string[]
  sliderGroups?: string[][]
  parties: PartyConfig[]
}

export interface RankedSeat {
  rank: number
  partyId: string
  partyCode: string
  partyName: string
  partyColor: string
  candidateName: string
  divisor: number
  quotient: number
  isElected: boolean
  neededShare: number | null
}

export interface PartyNextIn {
  partyId: string
  partyCode: string
  partyName: string
  partyColor: string
  currentSeats: number
  nextCandidateName: string | null
  nextDivisor: number | null
  neededShare: number | null
}

export interface AllocationResult {
  seatCount: number
  totalShare: number
  winningThreshold: number
  electedSeats: RankedSeat[]
  rankedSeats: RankedSeat[]
  nextInQueue: RankedSeat[]
  seatCounts: Record<string, number>
  partyNextIn: PartyNextIn[]
}
