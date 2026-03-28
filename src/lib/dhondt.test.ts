import { describe, expect, it } from 'vitest'
import { reykjavikMunicipality } from '../data/reykjavik'
import {
  buildDefaultVoteShares,
  calculateElection,
  findPartyNextIn,
  normalizeVoteShares,
} from './dhondt'

const expectedElected = [
  'D - Sjálfstæðisflokkurinn|Hildur Björnsdóttir, borgarfulltrúi',
  'S - Samfylkingin|Pétur Hafliði Marteinsson, rekstrarstjóri og fv. knattspyrnumaður',
  'D - Sjálfstæðisflokkurinn|Bjarni Eggerts Guðjónsson, forstöðumaður fyrirtækjasviðs',
  'M - Miðflokkurinn|Ari Edwald lögmaður og rekstrarhagfræðingur',
  'C - Viðreisn|Björg Magnúsdóttir, fjölmiðlakona og handritshöfundur',
  'S - Samfylkingin|Heiða Björg Hilmisdóttir, borgarstjóri',
  'V - Vinstrið|Sanna Magdalena Mörtudóttir, mannfræðingur og borgarfulltrúi',
  'D - Sjálfstæðisflokkurinn|Brynjar Þór Níelsson, lögfræðingur og fv. alþingismaður',
  'S - Samfylkingin|Steinunn Gyðu- og Guðjónsdóttir, ráðgjafi og fyrrum talskona Stígamóta',
  'D - Sjálfstæðisflokkurinn|Ragnhildur Alda María Vilhjálmsdóttir, borgarfulltrúi',
  'M - Miðflokkurinn|Kristín Kolbrún Waage Kolbeinsdóttir kennari og uppeldisráðgjafi',
  'C - Viðreisn|Róbert Ragnarsson, stjórnsýsluráðgjafi',
  'S - Samfylkingin|Skúli Helgason, borgarfulltrúi',
  'V - Vinstrið|Líf Magneudóttir, grunnskólakennari og borgarfulltrúi',
  'D - Sjálfstæðisflokkurinn|Rúnar Freyr Gíslason, leikari',
  'D - Sjálfstæðisflokkurinn|Guðný María Jóhannsdóttir, viðskiptafræðingur',
  'S - Samfylkingin|Stein Olav Romslo, kennari',
  'M - Miðflokkurinn|Lárus Blöndal Sigurðsson framkvæmdastjóri',
  'B - Framsóknarflokkurinn|Einar Þorsteinsson, borgarfulltrúi',
  'C - Viðreisn|Þorvaldur Davíð Kristjánsson, leikari',
  'D - Sjálfstæðisflokkurinn|Albert Guðmundsson, lögfræðingur, varaþingmaður og formaður Varðar',
  'S - Samfylkingin|Bjarnveig Birta Bjarnadóttir, rekstrarstjóri',
  'V - Vinstrið|Stefán Pálsson, sagnfræðingur og varaborgarfulltrúi',
]

describe('dhondt allocation', () => {
  it('matches the workbook elected order, seat counts, and first global next seats', () => {
    const result = calculateElection(
      reykjavikMunicipality,
      buildDefaultVoteShares(reykjavikMunicipality),
    )

    expect(
      result.electedSeats.map(
        (seat) => `${seat.partyName}|${seat.candidateName}`,
      ),
    ).toEqual(expectedElected)

    expect(result.seatCounts).toEqual({
      b: 1,
      c: 3,
      d: 7,
      f: 0,
      j: 0,
      m: 3,
      o: 0,
      p: 0,
      s: 6,
      v: 3,
    })

    expect(result.nextInQueue.slice(0, 7).map((seat) => seat.candidateName)).toEqual([
      'Kristinn Jón Ólafsson varaborgarfulltrúi',
      'Bjarni Fritzson, rithöfundur og bókaútgefandi',
      'Hlédís Maren Guðmundsdóttir félagsfræðingur',
      'Margrét Rós Sigurjónsdóttir, umhverfisfræðingur og framkvæmdastjóri Kolaportsins',
      'Regína Ásvaldsdóttir, bæjarstjóri í Mosfellsbæ',
      'Sigrún Ásta Einarsdóttir, framkvæmdastjóri',
      'Birkir Ingibjartsson, arkitekt og varaborgarfulltrúi',
    ])

    expect(result.nextInQueue[0].neededShare).toBeCloseTo(0.002333333333333333, 12)
    expect(result.nextInQueue[1].neededShare).toBeCloseTo(0.02466666666666667, 12)
    expect(result.nextInQueue[2].neededShare).toBeCloseTo(0.013333333333333336, 12)
    expect(result.nextInQueue[3].neededShare).toBeCloseTo(0.01833333333333334, 12)
  })

  it('computes next candidate per party using the winning threshold formula from the workbook', () => {
    const result = calculateElection(
      reykjavikMunicipality,
      buildDefaultVoteShares(reykjavikMunicipality),
    )

    expect(findPartyNextIn(result.partyNextIn, 'b')).toMatchObject({
      currentSeats: 1,
      nextCandidateName: 'Magnea Gná Jóhannsdóttir, borgarfulltrúi',
    })
    expect(findPartyNextIn(result.partyNextIn, 'p')?.neededShare).toBeCloseTo(
      0.002333333333333333,
      12,
    )
    expect(findPartyNextIn(result.partyNextIn, 'f')).toMatchObject({
      currentSeats: 0,
      nextCandidateName: 'FF númer 1',
    })
    expect(findPartyNextIn(result.partyNextIn, 'o')?.neededShare).toBeCloseTo(
      0.03233333333333334,
      12,
    )
  })
})

describe('vote normalization', () => {
  it('keeps totals at 100% and preserves the edited party exactly', () => {
    const defaultShares = buildDefaultVoteShares(reykjavikMunicipality)
    const rebalanced = normalizeVoteShares(
      reykjavikMunicipality,
      defaultShares,
      'p',
      0.08,
    )

    const total = Object.values(rebalanced).reduce((sum, share) => sum + share, 0)

    expect(rebalanced.p).toBeCloseTo(0.08, 12)
    expect(total).toBeCloseTo(1, 12)
    expect(rebalanced.s).toBeLessThan(defaultShares.s)
    expect(rebalanced.v).toBeLessThan(defaultShares.v)
    expect(rebalanced.d).toBeCloseTo(defaultShares.d, 12)
  })

  it('rebalances within the edited party slider groups before touching other parties', () => {
    const defaultShares = buildDefaultVoteShares(reykjavikMunicipality)
    const rebalanced = normalizeVoteShares(
      reykjavikMunicipality,
      defaultShares,
      'd',
      0.3,
    )

    expect(rebalanced.d).toBeCloseTo(0.3, 12)
    expect(rebalanced.c).toBeLessThan(defaultShares.c)
    expect(rebalanced.m).toBeLessThan(defaultShares.m)
    expect(rebalanced.b).toBeLessThan(defaultShares.b)
    expect(rebalanced.s).toBeCloseTo(defaultShares.s, 12)
    expect(rebalanced.v).toBeCloseTo(defaultShares.v, 12)
    expect(rebalanced.p).toBeCloseTo(defaultShares.p, 12)
    expect(rebalanced.j).toBeCloseTo(defaultShares.j, 12)
    expect(rebalanced.o).toBeCloseTo(defaultShares.o, 12)
  })

  it('uses the union of overlapping groups for parties that belong to both blocks', () => {
    const defaultShares = buildDefaultVoteShares(reykjavikMunicipality)
    const rebalanced = normalizeVoteShares(
      reykjavikMunicipality,
      defaultShares,
      'c',
      0.1,
    )

    expect(rebalanced.c).toBeCloseTo(0.1, 12)
    expect(rebalanced.d).toBeGreaterThan(defaultShares.d)
    expect(rebalanced.s).toBeGreaterThan(defaultShares.s)
    expect(rebalanced.v).toBeGreaterThan(defaultShares.v)
    expect(rebalanced.o).toBeCloseTo(defaultShares.o, 12)
  })

  it('falls back to an even redistribution inside the active slider group when its peers are all at zero', () => {
    const allInOneParty = reykjavikMunicipality.parties.reduce<Record<string, number>>(
      (accumulator, party) => {
        accumulator[party.id] = party.id === 'd' ? 1 : 0
        return accumulator
      },
      {},
    )

    const redistributed = normalizeVoteShares(
      reykjavikMunicipality,
      allInOneParty,
      'd',
      0.5,
    )

    expect(redistributed.d).toBeCloseTo(0.5, 12)
    expect(Object.values(redistributed).reduce((sum, share) => sum + share, 0)).toBeCloseTo(
      1,
      12,
    )
    expect(redistributed.b).toBeCloseTo(0.125, 12)
    expect(redistributed.c).toBeCloseTo(0.125, 12)
    expect(redistributed.f).toBeCloseTo(0.125, 12)
    expect(redistributed.m).toBeCloseTo(0.125, 12)
    expect(redistributed.s).toBeCloseTo(0, 12)
    expect(redistributed.v).toBeCloseTo(0, 12)
    expect(redistributed.p).toBeCloseTo(0, 12)
    expect(redistributed.j).toBeCloseTo(0, 12)
    expect(redistributed.o).toBeCloseTo(0, 12)
  })
})
