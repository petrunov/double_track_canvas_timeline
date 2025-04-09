// src/utils/createDrawCanvas.ts
import type { Ref } from 'vue'
import type { Item } from '@/services/dataService'

// Global Map to track fade progress for each item by its id.
const fadeProgress = new Map<string, number>()

export function createDrawCanvas(
  scrollCanvas: Ref<HTMLCanvasElement | null>,
  canvasWidth: Ref<number>,
  canvasHeight: Ref<number>,
  groupedItems: Ref<Record<string, Item[]>>,
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
) {
  let animationFrameId: number

  // Increase the effective width by 2 pixels.
  const effectiveItemWidth = itemWidth + 2

  // Screen size and scaling constants.
  const minScreenWidth = 320 // typical minimum mobile width
  const maxScreenWidth = 1920 // typical desktop width
  const minScale = 0.8 // scale factor at minScreenWidth
  const maxScale = 1.2 // scale factor at maxScreenWidth

  const getScaleFactor = () => {
    // Clamp the current canvas width between our min and max screen widths.
    const clampedWidth = Math.max(minScreenWidth, Math.min(canvasWidth.value, maxScreenWidth))
    // Calculate the interpolation ratio.
    const ratio = (clampedWidth - minScreenWidth) / (maxScreenWidth - minScreenWidth)
    // Linearly interpolate between minScale and maxScale.
    return minScale + (maxScale - minScale) * ratio
  }

  /**
   * Returns layout parameters used for drawing.
   */
  function getLayoutParams() {
    const rowHeight = canvasHeight.value / 2
    const marginFactor = 0.05
    const trackTopMargin = canvasHeight.value * marginFactor
    const bottomMargin = 10
    const trackContentHeight = rowHeight - trackTopMargin - bottomMargin
    const itemHeight = trackContentHeight / 3
    const yearLaneHeight = 20
    const laneY_local = trackTopMargin + trackContentHeight - yearLaneHeight
    const itemY_local = laneY_local - 20 - itemHeight
    return {
      rowHeight,
      trackTopMargin,
      bottomMargin,
      trackContentHeight,
      itemHeight,
      yearLaneHeight,
      laneY_local,
      itemY_local,
    }
  }

  /**
   * Helper function to extract the first item for each year.
   */
  function getFirstItems(): Item[] {
    return Object.values(groupedItems.value).map((group) => group[0])
  }

  /**
   * Updates the fade progress for an item and returns the transformation parameters.
   */
  function updateFadeProgress(itemId: string) {
    let progress = fadeProgress.get(itemId) ?? 0
    progress = Math.min(1, progress + 0.01)
    fadeProgress.set(itemId, progress)

    // Use the fade progress for the opacity.
    const alpha = progress
    // Compute fade‑specific transformation values:
    // Scale grows from 0.5 (50%) to 1 (100%).
    const fadeScale = 0.5 + progress * 0.5
    // Horizontal offset: starts 20px to the right and moves to 0.
    const offsetX = (1 - progress) * 20
    // Vertical offset: starts 30px above and falls to 0.
    const offsetY = (1 - progress) * -30

    return { alpha, fadeScale, offsetX, offsetY }
  }

  /**
   * Applies the fade-in transformation to the current context.
   */
  function applyFadeTransform(
    ctx: CanvasRenderingContext2D,
    fadeScale: number,
    offsetX: number,
    offsetY: number,
  ) {
    ctx.translate(effectiveItemWidth, 0)
    ctx.scale(fadeScale, fadeScale)
    ctx.translate(-effectiveItemWidth, 0)
    ctx.translate(offsetX, offsetY)
  }

  /**
   * Draws a single item on both tracks if it meets the category filter.
   */
  function drawItem(
    ctx: CanvasRenderingContext2D,
    item: Item,
    index: number,
    layout: ReturnType<typeof getLayoutParams>,
    globalScale: number,
  ) {
    const x = index * effectiveItemWidth - scrollX.value
    if (x + effectiveItemWidth < 0 || x > canvasWidth.value) {
      // Remove fade progress if the item is offscreen.
      fadeProgress.delete(String(item.id))
      return
    }

    const { alpha, fadeScale, offsetX, offsetY } = updateFadeProgress(String(item.id))

    // ------------------------
    // First Track: Items that are NOT world items.
    // ------------------------
    if (item.type !== 'world' && categoryFilter.value[item.category]) {
      ctx.save()
      ctx.translate(x, 0)
      ctx.globalAlpha = alpha
      // Apply fade-in transformation.
      applyFadeTransform(ctx, fadeScale, offsetX, offsetY)

      // Draw background rectangle.
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillRect(0, layout.itemY_local, effectiveItemWidth - 10, layout.itemHeight)
      // Draw text with font sizes scaled by the global scale factor.
      ctx.fillStyle = '#000'
      ctx.font = `bold ${14 * globalScale}px sans-serif`
      const titleEndY = wrapText(
        ctx,
        item.tamil_heading,
        5,
        layout.itemY_local + 30,
        effectiveItemWidth - 20,
        20 * globalScale,
      )
      ctx.font = `${14 * globalScale}px sans-serif`
      const tamilDescription =
        item.tamil_long_text.length > 47
          ? item.tamil_long_text.slice(0, 47) + '...'
          : item.tamil_long_text
      wrapText(ctx, tamilDescription, 5, titleEndY + 30, effectiveItemWidth - 20, 20 * globalScale)
      ctx.restore()
    }

    // ------------------------
    // Second Track: Items that are NOT tamil items.
    // ------------------------
    if (item.type !== 'tamil' && categoryFilter.value[item.category]) {
      ctx.save()
      ctx.translate(x, 0)
      ctx.globalAlpha = alpha
      // Apply fade‑in transformation.
      applyFadeTransform(ctx, fadeScale, offsetX, offsetY)

      // Translate into second track’s coordinate system.
      ctx.translate(0, layout.rowHeight)
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillRect(0, layout.itemY_local, effectiveItemWidth - 10, layout.itemHeight)

      ctx.fillStyle = '#000'
      ctx.font = `bold ${14 * globalScale}px sans-serif`
      const titleEndY = wrapText(
        ctx,
        item.english_heading,
        5,
        layout.itemY_local + 30,
        effectiveItemWidth - 20,
        20 * globalScale,
      )
      ctx.font = `${14 * globalScale}px sans-serif`
      const englishDescription =
        item.english_long_text.length > 47
          ? item.english_long_text.slice(0, 47) + '...'
          : item.english_long_text
      wrapText(
        ctx,
        englishDescription,
        5,
        titleEndY + 30,
        effectiveItemWidth - 20,
        20 * globalScale,
      )
      ctx.restore()
    }
  }

  /**
   * Loops through the first item of each year group and draws them.
   */
  function drawItems(
    ctx: CanvasRenderingContext2D,
    globalScale: number,
    layout: ReturnType<typeof getLayoutParams>,
  ) {
    const firstItems = getFirstItems()
    firstItems.forEach((item, index) => {
      drawItem(ctx, item, index, layout, globalScale)
    })
  }

  /**
   * Draws the background year lanes.
   */
  function drawYearLanes(
    ctx: CanvasRenderingContext2D,
    layout: ReturnType<typeof getLayoutParams>,
  ) {
    // First track lane.
    ctx.save()
    ctx.fillStyle = 'white'
    ctx.fillRect(0, layout.laneY_local, canvasWidth.value, layout.yearLaneHeight)
    ctx.restore()

    // Second track lane.
    ctx.save()
    ctx.translate(0, layout.rowHeight)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, layout.laneY_local, canvasWidth.value, layout.yearLaneHeight)
    ctx.restore()
  }

  /**
   * Draws the year labels for both tracks.
   */
  function drawYearLabels(
    ctx: CanvasRenderingContext2D,
    globalScale: number,
    layout: ReturnType<typeof getLayoutParams>,
  ) {
    const firstItems = getFirstItems()

    // First Track: Year Labels.
    firstItems.forEach((item, index) => {
      const x = index * effectiveItemWidth - scrollX.value
      if (x + effectiveItemWidth < 0 || x > canvasWidth.value) return
      if (item.type === 'world' || !categoryFilter.value[item.category]) return

      ctx.save()
      ctx.translate(x, 0)
      ctx.fillStyle = '#000'
      ctx.font = `${14 * globalScale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        String(item.year_ta),
        (effectiveItemWidth - 10) / 2,
        layout.laneY_local + layout.yearLaneHeight / 2,
      )
      ctx.restore()
    })

    // Second Track: Year Labels.
    firstItems.forEach((item, index) => {
      const x = index * effectiveItemWidth - scrollX.value
      if (x + effectiveItemWidth < 0 || x > canvasWidth.value) return
      if (item.type === 'tamil' || !categoryFilter.value[item.category]) return

      ctx.save()
      ctx.translate(x, 0)
      ctx.fillStyle = '#000'
      ctx.font = `${14 * globalScale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        `${item.year_ce} C.E.`,
        (effectiveItemWidth - 10) / 2,
        layout.rowHeight + layout.laneY_local + layout.yearLaneHeight / 2,
      )
      ctx.restore()
    })
  }

  /**
   * Draws arrow indicators for the year lanes.
   */
  function drawArrowIndicators(
    ctx: CanvasRenderingContext2D,
    layout: ReturnType<typeof getLayoutParams>,
  ) {
    const centerX = canvasWidth.value / 2
    const arrowWidth = 20
    const arrowHeight = 10

    // First Track Arrow:
    ctx.save()
    ctx.fillStyle = 'white'
    ctx.beginPath()
    const arrowCenterY1 = layout.laneY_local + layout.yearLaneHeight / 2 - 14
    ctx.moveTo(centerX, arrowCenterY1 - arrowHeight / 2)
    ctx.lineTo(centerX - arrowWidth / 2, arrowCenterY1 + arrowHeight / 2)
    ctx.lineTo(centerX + arrowWidth / 2, arrowCenterY1 + arrowHeight / 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Second Track Arrow:
    ctx.save()
    ctx.fillStyle = 'white'
    ctx.beginPath()
    const arrowCenterY2 = layout.rowHeight + layout.laneY_local + layout.yearLaneHeight / 2 - 14
    ctx.moveTo(centerX, arrowCenterY2 - arrowHeight / 2)
    ctx.lineTo(centerX - arrowWidth / 2, arrowCenterY2 + arrowHeight / 2)
    ctx.lineTo(centerX + arrowWidth / 2, arrowCenterY2 + arrowHeight / 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  /**
   * The main draw loop.
   */
  function drawCanvas() {
    if (!scrollCanvas.value) return
    const ctx = scrollCanvas.value.getContext('2d')
    if (!ctx) return

    // Clear the canvas.
    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

    const globalScale = getScaleFactor()
    const layout = getLayoutParams()

    drawItems(ctx, globalScale, layout)
    drawYearLanes(ctx, layout)
    drawYearLabels(ctx, globalScale, layout)
    drawArrowIndicators(ctx, layout)

    // Request the next animation frame.
    animationFrameId = requestAnimationFrame(drawCanvas)
  }

  return {
    drawCanvas,
    cancelAnimation: () => cancelAnimationFrame(animationFrameId),
  }
}
