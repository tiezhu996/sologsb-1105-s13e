export type SheetScale = '1:5000' | '1:50000'
export type SheetStatus = '待编' | '已编' | '待核'

/**
 * 四至邻接按方向登记：东、南、西、北各存一个邻图号，暂缺的方向留空字符串。
 */
export interface SheetNeighbors {
  east: string
  south: string
  west: string
  north: string
}

export interface Sheet {
  id: string
  code: string
  title: string
  year: number
  scale: SheetScale
  projection: string
  sheetSizeCm: string
  series: string
  neighbors: SheetNeighbors
  status: SheetStatus
}

export const SHEET_SCALES: SheetScale[] = ['1:5000', '1:50000']
export const SHEET_STATUSES: SheetStatus[] = ['待编', '已编', '待核']

export function createEmptyNeighbors(): SheetNeighbors {
  return { east: '', south: '', west: '', north: '' }
}

export function normalizeNeighbors(neighbors?: Partial<SheetNeighbors>): SheetNeighbors {
  return {
    east: neighbors?.east?.trim() ?? '',
    south: neighbors?.south?.trim() ?? '',
    west: neighbors?.west?.trim() ?? '',
    north: neighbors?.north?.trim() ?? '',
  }
}
