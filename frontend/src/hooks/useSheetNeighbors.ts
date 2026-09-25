import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { NeighborDirection, Sheet } from '../types/sheet'
import { NEIGHBOR_DIRECTIONS } from '../types/sheet'
import { useSheetStore } from '../stores/sheetStore'

export { NEIGHBOR_DIRECTIONS }
export type { NeighborDirection }

/** 一个方向上的图号是如何落位的 */
export type NeighborEntryOrigin = 'self' | 'inferred'

/**
 * self（本幅自填）的核对状态：
 * - aligned：对方反向同图号，或对方该方向暂缺（单向登记视为已对齐）
 * - pending：对方反向已登记别的图号，依对方自填为准，本条待核
 * - missing：图号在馆藏中查无图幅卡
 * inferred（对方登记补入）沿用对方自填，不再判待核。
 */
export type NeighborEntryState = 'aligned' | 'pending' | 'missing'

export interface NeighborEntry {
  code: string
  direction: NeighborDirection
  sheet?: Sheet
  origin: NeighborEntryOrigin
  state: NeighborEntryState
  /** pending 时对方反向实际登记的图号 */
  conflictCode?: string
}

export interface NeighborInbound {
  code: string
  sheet?: Sheet
  /** 他幅视角的方向（本幅方向的对向） */
  fromDirection: NeighborDirection
}

export interface NeighborSlot {
  direction: NeighborDirection
  /** 该方向最终展示的条目：本幅自填优先，暂缺时取对方登记补入 */
  entry?: NeighborEntry
  /** 与本幅自填不一致的他幅登记（供对方待核提示） */
  inbound: NeighborInbound[]
}

export interface NeighborStatus {
  source?: Sheet
  slots: NeighborSlot[]
  entries: NeighborEntry[]
  aligned: NeighborEntry[]
  pending: NeighborEntry[]
  missingCodes: string[]
  adjacentCount: number
}

/** 对向方向：东↔西，南↔北 */
const OPPOSITE_DIRECTION: Record<NeighborDirection, NeighborDirection> = {
  东: '西',
  南: '北',
  西: '东',
  北: '南',
}

export function oppositeDirection(direction: NeighborDirection): NeighborDirection {
  return OPPOSITE_DIRECTION[direction]
}

export function useSheetNeighbors(sheetId: MaybeRefOrGetter<string>) {
  const sheetStore = useSheetStore()

  function getNeighborStatus(id: string): NeighborStatus {
    const source = sheetStore.getSheetById(id)
    const slots: NeighborSlot[] = NEIGHBOR_DIRECTIONS.map((direction) => {
      const ownCode = (source?.neighbors[direction] ?? '').trim()
      const target = ownCode ? sheetStore.getSheetByCode(ownCode) : undefined

      // 他幅把本幅记为邻图：他幅的对向方向写了本幅图号。
      // 例如本幅东邻是乙，则乙的西邻应看到本幅。
      const inbound: NeighborInbound[] = source
        ? sheetStore.sheets
            .filter(
              (candidate) =>
                candidate.id !== source.id &&
                candidate.neighbors[OPPOSITE_DIRECTION[direction]] === source.code,
            )
            .map((candidate) => ({
              code: candidate.code,
              sheet: candidate,
              fromDirection: OPPOSITE_DIRECTION[direction],
            }))
        : []

      let entry: NeighborEntry | undefined
      if (ownCode) {
        let state: NeighborEntryState = 'aligned'
        let conflictCode: string | undefined
        if (!target) {
          state = 'missing'
        } else {
          // 直接看对方自填的反向字段：暂缺则单向已对齐，同号则互相对齐，异号则待核。
          const reverseCode = target.neighbors[OPPOSITE_DIRECTION[direction]].trim()
          if (reverseCode && reverseCode !== source?.code) {
            state = 'pending'
            conflictCode = reverseCode
          }
        }
        entry = {
          code: ownCode,
          direction,
          ...(target ? { sheet: target } : {}),
          origin: 'self',
          state,
          ...(conflictCode ? { conflictCode } : {}),
        }
      } else if (inbound.length) {
        // 本幅该方向暂缺：对方登记照对方自填落入本幅预览（对方登记补入）。
        const first = inbound[0]
        entry = {
          code: first.code,
          direction,
          ...(first.sheet ? { sheet: first.sheet } : {}),
          origin: 'inferred',
          state: 'aligned',
        }
      }

      // 与本幅落位同号的登记属互相对齐，不作为待核提示；其余的单列。
      const shownInbound = inbound.filter((item) => item.code !== (entry?.code ?? ''))

      return { direction, ...(entry ? { entry } : {}), inbound: shownInbound }
    })

    const entries = slots.flatMap((slot) => (slot.entry ? [slot.entry] : []))
    const aligned = entries.filter((entryItem) => entryItem.state === 'aligned')
    const pending = entries.filter((entryItem) => entryItem.state === 'pending')
    const missingCodes = [
      ...new Set(
        entries.filter((entryItem) => entryItem.state === 'missing').map((entryItem) => entryItem.code),
      ),
    ]

    return {
      ...(source ? { source } : {}),
      slots,
      entries,
      aligned,
      pending,
      missingCodes,
      adjacentCount: entries.length,
    }
  }

  const status = computed(() => getNeighborStatus(toValue(sheetId)))

  return {
    status,
    getNeighborStatus,
  }
}
