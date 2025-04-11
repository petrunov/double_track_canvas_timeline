// src/utils/minimapCalculations.ts

export interface Tick {
  left: number
  type: 'minor' | 'major' | 'medium'
  year?: number
}

/**
 * Computes timeline ticks based on the minimap width, margin and tick spacing.
 */
export function computeTimelineTicks(
  minimapWidth: number,
  margin: number = 0,
  tickSpacing: number = 15,
): Tick[] {
  const availableWidth = minimapWidth - margin * 2
  const tickCount = Math.floor(availableWidth / tickSpacing) + 1
  const ticks: Tick[] = []
  for (let i = 0; i < tickCount; i++) {
    const left = margin + i * tickSpacing
    ticks.push({ left, type: 'minor' })
  }
  return ticks
}

/**
 * Computes the minimap indicator geometry.
 *
 * @param scrollX - Current scroll position of the timeline (in pixels)
 * @param canvasWidth - Visible canvas width (in pixels)
 * @param totalContentWidth - Total width of the timeline (in pixels)
 * @param minimapWidth - Full width of the minimap (in pixels)
 * @param margin - Horizontal margin on the minimap (default 0)
 * @returns Object with indicatorWidth and indicatorLeft
 */
export function computeIndicatorStyle(
  scrollX: number,
  canvasWidth: number,
  totalContentWidth: number,
  minimapWidth: number,
  margin: number = 0,
): { indicatorWidth: number; indicatorLeft: number } {
  if (totalContentWidth <= canvasWidth) {
    return { indicatorWidth: minimapWidth, indicatorLeft: margin }
  }
  const indicatorWidth = Math.max(
    (canvasWidth / totalContentWidth) * (minimapWidth - margin * 2),
    10,
  )
  const availableTravel = minimapWidth - margin * 2 - indicatorWidth
  const scrollRatio = scrollX / (totalContentWidth - canvasWidth)
  const indicatorLeft = margin + scrollRatio * availableTravel
  return { indicatorWidth, indicatorLeft }
}

/**
 * Computes minimap rectangles for timeline items.
 *
 * @param groupedItems - Array of year groups where each group contains a list of group columns.
 * @param categoryFilter - Object mapping categories to booleans (visible or not).
 * @param itemWidth - The base width of each timeline item (in pixels).
 * @param minimapWidth - The total width of the minimap (in pixels).
 * @param leftMargin - Margin to apply on the left side (default: 2px).
 * @param timescaleHeight - Height reserved for the timescale (default: 20px).
 * @param minimapTotalHeight - Overall minimap height (default: 75px).
 * @returns Array of rectangle objects for each timeline item.
 */
export function computeMinimapRectangles(
  groupedItems: any[],
  categoryFilter: Record<string, boolean>,
  itemWidth: number,
  minimapWidth: number,
  leftMargin: number = 2,
  timescaleHeight: number = 20,
  minimapTotalHeight: number = 75,
): Array<{
  left: number
  top: number
  width: number
  height: number
  color: string
  title: string
  category: string
}> {
  if (!groupedItems || groupedItems.length === 0) return []

  const minimapItemWidth = 5
  const trackAreaHeight = minimapTotalHeight - timescaleHeight
  const trackHeight = trackAreaHeight / 2
  const rowCount = 6
  const rowHeight = trackHeight / rowCount
  const rectHeight = 1.5

  const rectangles: Array<{
    left: number
    top: number
    width: number
    height: number
    color: string
    title: string
    category: string
  }> = []

  let flatColumnIndex = 0
  let totalColumns = 0

  // Calculate total columns count
  groupedItems.forEach((yg) => {
    totalColumns += yg.groups.length
  })

  const EFFECTIVE_WIDTH_OFFSET = 2
  const effectiveItemWidth = itemWidth + EFFECTIVE_WIDTH_OFFSET
  const fullTimelineWidth = totalColumns * effectiveItemWidth

  groupedItems.forEach((yearGroup) => {
    yearGroup.groups.forEach((groupColumn: any) => {
      const rawX = flatColumnIndex * effectiveItemWidth
      const minimapX = leftMargin + (rawX / fullTimelineWidth) * (minimapWidth - 2 * leftMargin)

      // Upper track (for example, Tamil items)
      groupColumn.tamil.forEach((item: any, rowIndex: number) => {
        const totalItems = groupColumn.tamil.length
        const invertedRow = rowCount - totalItems + rowIndex
        const top = timescaleHeight + invertedRow * rowHeight - 10
        rectangles.push({
          left: minimapX,
          top,
          width: minimapItemWidth,
          height: rectHeight,
          color: (() => {
            const keys = Object.keys(categoryFilter).sort()
            const index = keys.indexOf(item.category)
            const colorPalette = [
              '#f44336',
              '#e91e63',
              '#9c27b0',
              '#2196f3',
              '#4caf50',
              '#ff9800',
              '#795548',
            ]
            return colorPalette[index % colorPalette.length]
          })(),
          title: item.tamil_heading,
          category: item.category,
        })
      })

      // Lower track (for example, English items)
      groupColumn.world.forEach((item: any, rowIndex: number) => {
        const totalItems = groupColumn.world.length
        const invertedRow = rowCount - totalItems + rowIndex
        const top = timescaleHeight + invertedRow * rowHeight + 10
        rectangles.push({
          left: minimapX,
          top,
          width: minimapItemWidth,
          height: rectHeight,
          color: (() => {
            const keys = Object.keys(categoryFilter).sort()
            const index = keys.indexOf(item.category)
            const colorPalette = [
              '#f44336',
              '#e91e63',
              '#9c27b0',
              '#2196f3',
              '#4caf50',
              '#ff9800',
              '#795548',
            ]
            return colorPalette[index % colorPalette.length]
          })(),
          title: item.english_heading,
          category: item.category,
        })
      })

      flatColumnIndex++
    })
  })

  return rectangles
}
