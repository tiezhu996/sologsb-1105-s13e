import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { Sheet } from '../types/sheet'
import { useSheetStore } from '../stores/sheetStore'

export type NeighborDirection = 'east' | 'south' | 'west' | 'north'

export interface NeighborDirectionMeta {
  key: NeighborDirection
  label: string
  english: string
  opposite: NeighborDirection
}

export const NEIGHBOR_DIRECTIONS: NeighborDirectionMeta[] = [
  { key: 'east', label: '东', english: 'EAST', opposite: 'west' },
  { key: 'south', label: '南', english: 'SOUTH', opposite: 'north' },
  { key: 'west', label: '西', english: 'WEST', opposite: 'east' },
  { key: 'north', label: '北', english: 'NORTH', opposite: 'south' },
]

const DIRECTION_META: Record<NeighborDirection, NeighborDirectionMeta> = Object.fromEntries(
  NEIGHBOR_DIRECTIONS.map((meta) => [meta.key, meta]),
) as Record<NeighborDirection, NeighborDirectionMeta>

/**
 * 邻接条目状态：
 * - aligned  已对齐：本幅与邻幅互相登记了对方；
 * - pending  待核：邻幅对应方向已自填其他图号，以邻幅自填为准，本条待核；
 * - oneSided 单向登记：邻幅对应方向留空，尚未回登本幅；
 * - missing  缺编：登记的图号尚未建立本地图幅卡；
 * - inferred 对方登记：本幅该方向留空，由邻幅的登记对应带入。
 */
export type NeighborEntryState = 'aligned' | 'pending' | 'oneSided' | 'missing' | 'inferred'

export interface NeighborEntry {
  direction: NeighborDirection
  directionLabel: string
  code: string
  sheet?: Sheet
  origin: 'self' | 'incoming'
  state: NeighborEntryState
  note?: string
}

export interface NeighborStatus {
  source?: Sheet
  entries: NeighborEntry[]
  alignedEntries: NeighborEntry[]
  pendingEntries: NeighborEntry[]
  oneSidedEntries: NeighborEntry[]
  missingCodes: string[]
  adjacentCount: number
}

export function useSheetNeighbors(sheetId: MaybeRefOrGetter<string>) {
  const sheetStore = useSheetStore()

  function buildSelfEntry(source: Sheet, meta: NeighborDirectionMeta, code: string): NeighborEntry {
    const base = { direction: meta.key, directionLabel: meta.label, code, origin: 'self' as const }
    const sheet = sheetStore.getSheetByCode(code)
    if (!sheet) {
      return { ...base, state: 'missing' }
    }
    const oppositeMeta = DIRECTION_META[meta.opposite]
    const reverseCode = sheet.neighbors[meta.opposite]?.trim() ?? ''
    if (reverseCode === source.code) {
      return { ...base, sheet, state: 'aligned' }
    }
    if (!reverseCode) {
      return {
        ...base,
        sheet,
        state: 'oneSided',
        note: `${sheet.code} 的${oppositeMeta.label}邻尚未登记，待对方补登后对齐。`,
      }
    }
    return {
      ...base,
      sheet,
      state: 'pending',
      note: `${sheet.code} 自填${oppositeMeta.label}邻为 ${reverseCode}，以其自填为准，本条待核。`,
    }
  }

  function buildIncomingEntry(source: Sheet, meta: NeighborDirectionMeta): NeighborEntry | null {
    const oppositeMeta = DIRECTION_META[meta.opposite]
    const incoming = sheetStore.sheets.find(
      (candidate) => candidate.id !== source.id && (candidate.neighbors[meta.opposite]?.trim() ?? '') === source.code,
    )
    if (!incoming) {
      return null
    }
    return {
      direction: meta.key,
      directionLabel: meta.label,
      code: incoming.code,
      sheet: incoming,
      origin: 'incoming',
      state: 'inferred',
      note: `本幅该方向留空，由 ${incoming.code} 登记的${oppositeMeta.label}邻对应带入。`,
    }
  }

  function getNeighborStatus(id: string): NeighborStatus {
    const source = sheetStore.getSheetById(id)
    if (!source) {
      return {
        entries: [],
        alignedEntries: [],
        pendingEntries: [],
        oneSidedEntries: [],
        missingCodes: [],
        adjacentCount: 0,
      }
    }
    const entries: NeighborEntry[] = []
    for (const meta of NEIGHBOR_DIRECTIONS) {
      const code = source.neighbors[meta.key]?.trim() ?? ''
      if (code) {
        entries.push(buildSelfEntry(source, meta, code))
      } else {
        const incomingEntry = buildIncomingEntry(source, meta)
        if (incomingEntry) {
          entries.push(incomingEntry)
        }
      }
    }
    return {
      source,
      entries,
      alignedEntries: entries.filter((entry) => entry.state === 'aligned'),
      pendingEntries: entries.filter((entry) => entry.state === 'pending'),
      oneSidedEntries: entries.filter((entry) => entry.state === 'oneSided'),
      missingCodes: entries.filter((entry) => entry.state === 'missing').map((entry) => entry.code),
      adjacentCount: entries.filter((entry) => entry.origin === 'self').length,
    }
  }

  const status = computed(() => getNeighborStatus(toValue(sheetId)))

  return {
    status,
    getNeighborStatus,
  }
}
