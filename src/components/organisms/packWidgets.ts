import type { WidgetSize } from '@/kit/define'

/** A widget placed on a grid page: 1-based column and row, and the cells it spans. */
export interface Placed<T> {
  item: T
  column: number
  row: number
  width: number
  height: number
}

/**
 * Flows widgets into pages of `columns` x `rows` cells, in order, like iOS: each
 * takes the first free spot that fits (row by row). A widget that no longer fits
 * starts a new page, and so does each page of kiosk.yaml. Widgets wider or taller
 * than the grid are clamped to it.
 */
export function packWidgets<T extends { size: WidgetSize }>(
  pages: T[][],
  columns: number,
  rows: number,
): Placed<T>[][] {
  const out: Placed<T>[][] = []
  for (const page of pages) {
    let used: boolean[][] = []
    let placed: Placed<T>[] = []
    const free = (column: number, row: number, width: number, height: number) => {
      for (let r = row; r < row + height; r++)
        for (let c = column; c < column + width; c++) if (used[r]?.[c]) return false
      return true
    }
    const spotFor = (width: number, height: number) => {
      for (let row = 0; row + height <= rows; row++)
        for (let column = 0; column + width <= columns; column++)
          if (free(column, row, width, height)) return { column, row }
      return undefined
    }

    for (const item of page) {
      const [w, h] = item.size.split('x').map(Number) as [number, number]
      const width = Math.min(w, columns)
      const height = Math.min(h, rows)
      let spot = spotFor(width, height)
      if (!spot) {
        out.push(placed)
        used = []
        placed = []
        spot = { column: 0, row: 0 }
      }
      for (let r = spot.row; r < spot.row + height; r++)
        for (let c = spot.column; c < spot.column + width; c++) (used[r] ??= [])[c] = true
      placed.push({ item, column: spot.column + 1, row: spot.row + 1, width, height })
    }
    if (placed.length) out.push(placed)
  }
  return out
}
