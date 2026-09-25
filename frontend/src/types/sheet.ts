export type SheetScale = '1:5000' | '1:50000'
export type SheetStatus = '待编' | '已编' | '待核'

/**
 * 四至邻接按方向登记：每个方向存一个邻图图号。
 * 暂缺的方向存空字符串，不再用数组下标隐式表达方向。
 */
export const NEIGHBOR_DIRECTIONS = ['东', '南', '西', '北'] as const
export type NeighborDirection = (typeof NEIGHBOR_DIRECTIONS)[number]

export type SheetNeighbors = Record<NeighborDirection, string>

export function createEmptyNeighbors(): SheetNeighbors {
  return { 东: '', 南: '', 西: '', 北: '' }
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
