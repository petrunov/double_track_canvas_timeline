// src/utils/createDrawCanvas.ts
import type { Ref } from 'vue'
import type { YearGroup } from '@/services/dataService'

export function createDrawCanvas(
  scrollCanvas: Ref<HTMLCanvasElement | null>,
  canvasWidth: Ref<number>,
  canvasHeight: Ref<number>,
  groupedItems: Ref<YearGroup[]>,
  itemWidth: number,
  scrollX: Ref<number>,
  categoryFilter: Ref<Record<string, boolean>>,
  wrapText: (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ) => number,
  minimapWidth: number, // passed as a number for indicator calculations
): {
  drawCanvas: () => void
  cancelAnimation: () => void
  updateTransforms: () => { indicatorWidth: number; indicatorLeft: number }
} {
  // --- Constants & Helper Definitions ---
  const EFFECTIVE_WIDTH_OFFSET = 2
  const REFERENCE_SINGLE_ITEM_HEIGHT = 90 // For a single item before scaling
  const MIN_SCREEN_WIDTH = 320
  const REFERENCE_MAX_SCREEN_WIDTH = 1920

  const MIN_INDICATOR_WIDTH = 10

  // Helper: calculate the global scale factor based on canvasWidth.
  const getScaleFactor = () => {
    const clampedWidth = Math.max(
      MIN_SCREEN_WIDTH,
      Math.min(canvasWidth.value, REFERENCE_MAX_SCREEN_WIDTH),
    )
    const ratio =
      (clampedWidth - MIN_SCREEN_WIDTH) / (REFERENCE_MAX_SCREEN_WIDTH - MIN_SCREEN_WIDTH)
    const MIN_SCALE = 0.8,
      MAX_SCALE = 1.2
    return MIN_SCALE + (MAX_SCALE - MIN_SCALE) * ratio
  }

  // --- Define layout parameters based on canvas dimensions and scale.
  function getLayoutParams(globalScale: number) {
    const rowHeight = canvasHeight.value / 2
    const trackTopMargin = canvasHeight.value * 0.05
    const bottomMargin = 10
    const trackContentHeight = rowHeight - trackTopMargin - bottomMargin

    const singleItemHeight = REFERENCE_SINGLE_ITEM_HEIGHT * globalScale
    const yearLaneHeight = 20 * globalScale
    const laneY = trackTopMargin + trackContentHeight - yearLaneHeight
    const itemY = laneY - 20 * globalScale - singleItemHeight

    return {
      rowHeight,
      trackTopMargin,
      bottomMargin,
      trackContentHeight,
      singleItemHeight,
      yearLaneHeight,
      laneY,
      itemY,
    }
  }

  // --- Fade Progress Helpers ---
  const fadeProgress = new Map<string, number>()
  const updateFadeProgress = (itemId: string) => {
    const progress = Math.min(1, (fadeProgress.get(itemId) ?? 0) + 0.01)
    fadeProgress.set(itemId, progress)
    const alpha = progress
    const REFERENCE_FADE_INITIAL_SCALE = 0.5
    const REFERENCE_FADE_FINAL_SCALE = 1.0
    const REFERENCE_FADE_TRANSLATE_X = 20
    const REFERENCE_FADE_TRANSLATE_Y = 30
    const fadeScale =
      REFERENCE_FADE_INITIAL_SCALE +
      progress * (REFERENCE_FADE_FINAL_SCALE - REFERENCE_FADE_INITIAL_SCALE)
    const offsetX = (1 - progress) * REFERENCE_FADE_TRANSLATE_X
    const offsetY = (1 - progress) * -REFERENCE_FADE_TRANSLATE_Y
    return { alpha, fadeScale, offsetX, offsetY }
  }

  const applyFadeTransform = (
    ctx: CanvasRenderingContext2D,
    fadeScale: number,
    offsetX: number,
    offsetY: number,
    globalScale: number,
    effectiveItemWidth: number,
  ) => {
    ctx.translate(effectiveItemWidth, 0)
    ctx.scale(fadeScale, fadeScale)
    ctx.translate(-effectiveItemWidth, 0)
    ctx.translate(offsetX * globalScale, offsetY * globalScale)
  }

  const clipText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
    let txt = text || ''
    if (ctx.measureText(txt).width <= maxWidth) return txt
    while (ctx.measureText(txt + '...').width > maxWidth && txt.length > 0) {
      txt = txt.slice(0, -1)
    }
    return txt + '...'
  }

  const drawRectWithText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    globalScale: number,
    isMulti: boolean,
  ) => {
    const REFERENCE_TEXT_MARGIN = 5
    const REFERENCE_BASE_FONT_SIZE = 14
    const REFERENCE_LINE_HEIGHT_MULTIPLIER = 20
    const REFERENCE_SINGLE_ITEM_TEXT_Y_OFFSET = 30
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = '#000'
    ctx.font = `bold ${REFERENCE_BASE_FONT_SIZE * globalScale}px sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    if (isMulti) {
      const clippedTitle = clipText(ctx, text, width - 2 * (REFERENCE_TEXT_MARGIN * globalScale))
      ctx.fillText(clippedTitle, x + REFERENCE_TEXT_MARGIN * globalScale, y + height / 2)
    } else {
      wrapText(
        ctx,
        text,
        x + REFERENCE_TEXT_MARGIN * globalScale,
        y + REFERENCE_SINGLE_ITEM_TEXT_Y_OFFSET * globalScale,
        width - 2 * (REFERENCE_TEXT_MARGIN * globalScale),
        REFERENCE_LINE_HEIGHT_MULTIPLIER * globalScale,
      )
    }
  }

  // --- Draw a Track of Items ---
  const drawTrack = (
    ctx: CanvasRenderingContext2D,
    items: { id: string; tamil_heading?: string; english_heading?: string; category?: string }[],
    offsetX: number,
    offsetY: number,
    globalScale: number,
    layout: ReturnType<typeof getLayoutParams>,
    effectiveItemWidth: number,
    getTitle: (item: { id: string; tamil_heading?: string; english_heading?: string }) => string,
  ) => {
    if (!items.length) return

    ctx.save()
    ctx.translate(offsetX, offsetY)

    const drawOneItem = (item: any, y: number, rectHeight: number) => {
      const visible = categoryFilter.value[item.category || ''] !== false
      const { alpha, fadeScale, offsetX: fx, offsetY: fy } = updateFadeProgress(String(item.id))
      const effectiveAlpha = visible ? alpha : 0
      ctx.save()
      ctx.globalAlpha = effectiveAlpha
      applyFadeTransform(ctx, fadeScale, fx, fy, globalScale, effectiveItemWidth)
      drawRectWithText(
        ctx,
        getTitle(item),
        0,
        y,
        effectiveItemWidth - 10,
        rectHeight,
        globalScale,
        items.length > 1,
      )
      // Draw the top category indicator
      const topIndicatorHeight = 5 * globalScale
      const getCategoryColor = (category: string): string => {
        const keys = Object.keys(categoryFilter.value).sort()
        const index = keys.indexOf(category)
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
      }
      ctx.fillStyle = getCategoryColor(item.category || '')
      ctx.fillRect(0, y, effectiveItemWidth - 10, topIndicatorHeight)
      ctx.restore()
    }

    if (items.length === 1) {
      const y = layout.itemY
      drawOneItem(items[0], y, layout.singleItemHeight)
    } else {
      const REFERENCE_MULTI_ITEM_UNIT = 90
      const REFERENCE_MULTI_ITEM_GAP = 4
      const multiItemUnit = REFERENCE_MULTI_ITEM_UNIT * globalScale
      const multiItemGap = REFERENCE_MULTI_ITEM_GAP * globalScale
      const totalMultiHeight = items.length * multiItemUnit
      const startY = layout.itemY + layout.singleItemHeight - totalMultiHeight
      const itemHeightMulti = multiItemUnit - (multiItemGap * (items.length - 1)) / items.length
      items.forEach((item, i) => {
        const y = startY + i * (itemHeightMulti + multiItemGap)
        drawOneItem(item, y, itemHeightMulti)
      })
    }

    ctx.restore()
  }

  // --- Draw Year Elements (Tracks with Year Labels) ---
  const drawYearElements = (
    ctx: CanvasRenderingContext2D,
    layout: ReturnType<typeof getLayoutParams>,
    globalScale: number,
    effectiveItemWidth: number,
  ) => {
    // For example, draw a white rectangle for the lane(s) in which the years are drawn.
    ctx.save()
    ctx.fillStyle = 'white'
    // Draw a background lane for the top year label.
    ctx.fillRect(0, layout.laneY, canvasWidth.value, layout.yearLaneHeight)
    // Draw a second lane below for a secondary label if needed.
    ctx.translate(0, layout.rowHeight)
    ctx.fillRect(0, layout.laneY, canvasWidth.value, layout.yearLaneHeight)
    ctx.restore()

    let flatIndex = 0
    groupedItems.value.forEach(({ year, groups }) => {
      groups.forEach(() => {
        const x = flatIndex * effectiveItemWidth - scrollX.value
        // Only draw if within the current viewport:
        if (x + effectiveItemWidth >= 0 && x <= canvasWidth.value) {
          ctx.save()
          ctx.font = `${14 * globalScale}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = '#000'
          // Draw the primary year label in the top lane.
          ctx.fillText(
            `${year}`,
            x + (effectiveItemWidth - 10) / 2,
            layout.laneY + layout.yearLaneHeight / 2,
          )
          // Optionally draw a secondary label in the bottom lane.
          ctx.fillText(
            `${year} C.E.`,
            x + (effectiveItemWidth - 10) / 2,
            layout.rowHeight + layout.laneY + layout.yearLaneHeight / 2,
          )
          ctx.restore()
        }
        flatIndex++
      })
    })
  }

  // --- Draw Arrow Indicators ---
  const drawArrowIndicators = (
    ctx: CanvasRenderingContext2D,
    layout: ReturnType<typeof getLayoutParams>,
    globalScale: number,
  ) => {
    const centerX = canvasWidth.value / 2
    const REFERENCE_ARROW_WIDTH = 20
    const REFERENCE_ARROW_HEIGHT = 10
    const arrowWidth = REFERENCE_ARROW_WIDTH * globalScale
    const arrowHeight = REFERENCE_ARROW_HEIGHT * globalScale

    const drawArrow = (y: number) => {
      ctx.beginPath()
      ctx.moveTo(centerX, y - arrowHeight / 2)
      ctx.lineTo(centerX - arrowWidth / 2, y + arrowHeight / 2)
      ctx.lineTo(centerX + arrowWidth / 2, y + arrowHeight / 2)
      ctx.closePath()
      ctx.fill()
    }
    ctx.save()
    ctx.fillStyle = 'white'
    // Draw arrows for each lane (adjust vertical offsets as needed)
    drawArrow(layout.laneY + layout.yearLaneHeight / 2 - 14 * globalScale)
    drawArrow(layout.rowHeight + layout.laneY + layout.yearLaneHeight / 2 - 14 * globalScale)
    ctx.restore()
  }

  let animationFrameId: number
  const drawCanvas = () => {
    if (!scrollCanvas.value) return
    const ctx = scrollCanvas.value.getContext('2d')
    if (!ctx) return

    const globalScale = getScaleFactor()
    const effectiveItemWidth = itemWidth * globalScale + EFFECTIVE_WIDTH_OFFSET

    // Calculate total columns and full timeline width.
    const totalColumns = groupedItems.value.reduce((sum, yg) => sum + yg.groups.length, 0)
    const timelineFullWidth = totalColumns * effectiveItemWidth

    const maxScrollX = Math.max(0, timelineFullWidth - canvasWidth.value)
    if (scrollX.value < 0) scrollX.value = 0
    else if (scrollX.value > maxScrollX) scrollX.value = maxScrollX

    const layout = getLayoutParams(globalScale)
    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

    let flatColumnIndex = 0
    groupedItems.value.forEach((yearGroup) => {
      yearGroup.groups.forEach((groupColumn) => {
        const x = flatColumnIndex * effectiveItemWidth - scrollX.value
        if (x + effectiveItemWidth >= 0 && x <= canvasWidth.value) {
          drawTrack(
            ctx,
            groupColumn.tamil.map((item) => ({ ...item, id: String(item.id) })),
            x,
            0,
            globalScale,
            layout,
            effectiveItemWidth,
            (item) => item.tamil_heading || '',
          )
          drawTrack(
            ctx,
            groupColumn.world.map((item) => ({ ...item, id: String(item.id) })),
            x,
            layout.rowHeight,
            globalScale,
            layout,
            effectiveItemWidth,
            (item) => item.english_heading || '',
          )
        } else {
          groupColumn.tamil.forEach((item) => fadeProgress.delete(String(item.id)))
          groupColumn.world.forEach((item) => fadeProgress.delete(String(item.id)))
        }
        flatColumnIndex++
      })
    })

    // Draw the year lanes and labels.
    drawYearElements(ctx, layout, globalScale, effectiveItemWidth)
    // Draw arrow indicators.
    drawArrowIndicators(ctx, layout, globalScale)

    animationFrameId = requestAnimationFrame(drawCanvas)
  }

  // --- Update Transforms for the Minimap Indicator ---
  const updateTransforms = () => {
    const scale = getScaleFactor()
    const totalColumns = groupedItems.value.reduce((sum, yg) => sum + yg.groups.length, 0)
    const effectiveItemWidth = itemWidth * scale + EFFECTIVE_WIDTH_OFFSET
    const timelineFullWidth = totalColumns * effectiveItemWidth
    const viewportWidth = canvasWidth.value
    let indicatorWidth = (viewportWidth / timelineFullWidth) * minimapWidth
    if (indicatorWidth < MIN_INDICATOR_WIDTH) indicatorWidth = MIN_INDICATOR_WIDTH
    const minIndicatorWidth = 10
    if (indicatorWidth < minIndicatorWidth) indicatorWidth = minIndicatorWidth

    const leftMargin = 0
    const availableMinimapWidth = minimapWidth - 2 * leftMargin
    const indicatorLeft = leftMargin + (scrollX.value / timelineFullWidth) * availableMinimapWidth

    return { indicatorWidth, indicatorLeft }
  }

  return {
    drawCanvas,
    cancelAnimation: () => cancelAnimationFrame(animationFrameId),
    updateTransforms,
  }
}
