import type { Ref } from 'vue'
import type { YearGroup } from '@/services/dataService'

// Preload item images.
const itemImages: HTMLImageElement[] = []
itemImages[0] = new Image()
itemImages[0].src = new URL('@/assets/item-image.jfif', import.meta.url).href
itemImages[1] = new Image()
itemImages[1].src = new URL('@/assets/item-image2.jfif', import.meta.url).href
itemImages[2] = new Image()
itemImages[2].src = new URL('@/assets/item-image3.jfif', import.meta.url).href
itemImages[3] = new Image()
itemImages[3].src = new URL('@/assets/item-image4.webp', import.meta.url).href
itemImages[4] = new Image()
itemImages[4].src = new URL('@/assets/item-image5.jpg', import.meta.url).href
itemImages[5] = new Image()
itemImages[5].src = new URL('@/assets/item-image6.avif', import.meta.url).href

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return hash
}

function lerp(start: number, end: number, amt: number): number {
  return start + (end - start) * amt
}

/**
 * Utility: convert a hex color (e.g. "#f44336") to an rgba string using the provided alpha.
 */
function hexToRgba(hex: string, alpha: number): string {
  let r = 0,
    g = 0,
    b = 0
  // Handle shorthand hex form (#f43)
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16)
    g = parseInt(hex[2] + hex[2], 16)
    b = parseInt(hex[3] + hex[3], 16)
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16)
    g = parseInt(hex.slice(3, 5), 16)
    b = parseInt(hex.slice(5, 7), 16)
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Define a type for the click (ripple) effect.
type ClickEffect = {
  startTime: number
  clickX: number
  clickY: number
}

/**
 * createDrawCanvas is responsible for drawing the timeline on the canvas.
 * In addition to drawing, it builds an array of hitAreas with bounding boxes
 * for each drawn item so that click events can determine which item was clicked.
 * It now supports two effects:
 *  1. A ripple effect: when an item is clicked, calling highlightItem(itemId, clickX, clickY)
 *     shows a ripple that starts at the click spot and fades out over a set duration.
 *  2. A “pop” effect: the item scales up briefly (pops) on hit and then returns to normal.
 */
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
  minimapWidth: number,
): {
  drawCanvas: () => void
  cancelAnimation: () => void
  updateTransforms: () => { indicatorWidth: number; indicatorLeft: number }
  hitTest: (x: number, y: number) => { id: string; data: any } | null
  highlightItem: (itemId: string, clickX: number, clickY: number) => void
  hitAreas: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
    data: unknown
  }>
} {
  const EFFECTIVE_WIDTH_OFFSET = 2
  const REFERENCE_SINGLE_ITEM_HEIGHT = 90
  const MIN_SCREEN_WIDTH = 320
  const REFERENCE_MAX_SCREEN_WIDTH = 1920
  const MIN_INDICATOR_WIDTH = 10

  // This array will hold the bounding boxes of drawn items.
  // Only items drawn (and visible) are added.
  const hitAreas: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
    data: any
  }> = []

  // This map stores the click effect for an item.
  // A ripple effect (and pop effect) will be rendered for HIGHLIGHT_DURATION ms after calling highlightItem.
  const clickEffects = new Map<string, ClickEffect>()
  const HIGHLIGHT_DURATION = 300 // duration in ms

  // Call this function to trigger a ripple and pop effect on an item.
  // The caller must supply the click coordinates (relative to the item).
  const highlightItem = (itemId: string, clickX: number, clickY: number) => {
    clickEffects.set(itemId, { startTime: performance.now(), clickX, clickY })
  }

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

  const fadeProgress = new Map<string, number>()
  const FADING_SPEED = 0.04 // adjust as needed

  const updateFadeProgress = (itemId: string) => {
    const progress = Math.min(1, (fadeProgress.get(itemId) ?? 0) + FADING_SPEED)
    fadeProgress.set(itemId, progress)

    const alpha = progress
    // This fadeScale determines the transformation of the item’s background.
    const fadeScale = 0.5 + progress * 0.5
    const offsetX = (1 - progress) * 20
    const offsetY = (1 - progress) * -30

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

  // Draws the background white box (representing an item) with a neat drop shadow,
  // then draws its image and text. No text shadow is applied.
  const drawRectWithText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    globalScale: number,
    isMulti: boolean,
    image: HTMLImageElement,
  ) => {
    const REFERENCE_TEXT_MARGIN = 5
    const REFERENCE_BASE_FONT_SIZE = 14
    const REFERENCE_LINE_HEIGHT_MULTIPLIER = 20
    const REFERENCE_SINGLE_ITEM_TEXT_Y_OFFSET = 30

    const IMAGE_SIZE = 60 * globalScale
    const margin = REFERENCE_TEXT_MARGIN * globalScale
    const imageX = x + margin
    const imageY = y + (height - IMAGE_SIZE) / 2
    const TEXT_START_X = imageX + IMAGE_SIZE + margin

    // Draw the background white box with drop shadow.
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1
    ctx.fillStyle = 'rgba(255,255,255,1)'
    ctx.fillRect(x, y, width, height)
    ctx.restore()

    // Draw the image if it's loaded.
    if (image?.complete) {
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight)
      const sx = (image.naturalWidth - cropSize) / 2
      const sy = 0
      ctx.drawImage(image, sx, sy, cropSize, cropSize, imageX, imageY, IMAGE_SIZE, IMAGE_SIZE)
    }

    // Draw the text normally without a text shadow.
    ctx.fillStyle = '#000'
    ctx.font = `bold ${REFERENCE_BASE_FONT_SIZE * globalScale}px sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    if (isMulti) {
      const clippedTitle = clipText(ctx, text, width - (TEXT_START_X - x) - margin)
      ctx.fillText(clippedTitle, TEXT_START_X, y + height / 2)
    } else {
      wrapText(
        ctx,
        text,
        TEXT_START_X,
        y + REFERENCE_SINGLE_ITEM_TEXT_Y_OFFSET * globalScale,
        width - (TEXT_START_X - x) - margin,
        REFERENCE_LINE_HEIGHT_MULTIPLIER * globalScale,
      )
    }
  }

  // drawTrack draws a track of items and records each drawn item’s bounding box in hitAreas.
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

    // Draw each item and record its hit area.
    const drawOneItem = (item: any, y: number, rectHeight: number) => {
      const visible = categoryFilter.value[item.category || ''] !== false
      const { alpha, fadeScale, offsetX: fx, offsetY: fy } = updateFadeProgress(String(item.id))
      ctx.save()
      ctx.globalAlpha = visible ? alpha : 0
      applyFadeTransform(ctx, fadeScale, fx, fy, globalScale, effectiveItemWidth)

      // If this item is clicked, apply a pop effect:
      // Compute progress (0 to 1) and use a simple easing function that peaks at progress=0.5.
      if (clickEffects.has(item.id)) {
        const effect = clickEffects.get(item.id)!
        const elapsed = performance.now() - effect.startTime
        const progress = Math.min(1, elapsed / HIGHLIGHT_DURATION)
        // popScale goes from 1.0 at progress=0 and 1.0 at progress=1 with a peak at 1.1 at progress=0.5.
        const popScale = 1 + 0.1 * (1 - Math.abs(progress - 0.5) * 2.5)
        const centerX = (effectiveItemWidth - 10) / 2
        const centerY = y + rectHeight / 2
        ctx.translate(centerX, centerY)
        ctx.scale(popScale, popScale)
        ctx.translate(-centerX, -centerY)
      }

      const image = itemImages[Math.abs(hashCode(item.id)) % itemImages.length]
      drawRectWithText(
        ctx,
        getTitle(item),
        0,
        y,
        effectiveItemWidth - 10,
        rectHeight,
        globalScale,
        items.length > 1,
        image,
      )
      // Draw a top indicator.
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

      // Record a hit area (using absolute coordinates).
      const absX = offsetX
      const absY = offsetY + y
      if (visible) {
        hitAreas.push({
          id: item.id,
          x: absX,
          y: absY,
          width: effectiveItemWidth - 10,
          height: rectHeight,
          data: item,
        })
      }

      // Instead of drawing a solid overlay, draw a ripple effect.
      if (clickEffects.has(item.id)) {
        const effect = clickEffects.get(item.id)!
        const elapsed = performance.now() - effect.startTime
        const progress = elapsed / HIGHLIGHT_DURATION
        if (progress < 1) {
          ctx.save()
          // Set a clipping region to confine the ripple effect within the item.
          ctx.beginPath()
          ctx.rect(0, y, effectiveItemWidth - 10, rectHeight)
          ctx.clip()

          const rectWidth = effectiveItemWidth - 10
          // Use provided click coordinates relative to the item.
          const localX = effect.clickX
          const localY = effect.clickY
          // Calculate the maximum radius from the click point to the item's corners.
          const dx = Math.max(localX, rectWidth - localX)
          const dy = Math.max(localY, rectHeight - localY)
          const maxRadius = Math.sqrt(dx * dx + dy * dy)
          const radius = progress * maxRadius
          // Fade the ripple's opacity from 0.3 to 0.
          const rippleAlpha = 0.3 * (1 - progress)
          ctx.beginPath()
          // Draw ripple using the item-relative coordinates.
          ctx.arc(localX, y + localY, radius, 0, Math.PI * 2)
          // Use the category-dependent color and convert it to RGBA.
          const baseColor = getCategoryColor(item.category || '')
          ctx.fillStyle = hexToRgba(baseColor, rippleAlpha)
          ctx.fill()
          ctx.restore()
        } else {
          clickEffects.delete(item.id)
        }
      }
    }

    if (items.length === 1) {
      const y = layout.itemY
      drawOneItem(items[0], y, layout.singleItemHeight)
    } else {
      const unit = 90 * globalScale
      const gap = 4 * globalScale
      const totalHeight = items.length * unit
      const startY = layout.itemY + layout.singleItemHeight - totalHeight
      const heightEach = unit - (gap * (items.length - 1)) / items.length
      items.forEach((item, i) => {
        const y = startY + i * (heightEach + gap)
        drawOneItem(item, y, heightEach)
      })
    }

    ctx.restore()
  }

  const drawYearElements = (
    ctx: CanvasRenderingContext2D,
    layout: ReturnType<typeof getLayoutParams>,
    globalScale: number,
    effectiveItemWidth: number,
  ) => {
    ctx.save()
    ctx.fillStyle = 'white'
    ctx.fillRect(0, layout.laneY, canvasWidth.value, layout.yearLaneHeight)
    ctx.translate(0, layout.rowHeight)
    ctx.fillRect(0, layout.laneY, canvasWidth.value, layout.yearLaneHeight)
    ctx.restore()

    let flatIndex = 0
    groupedItems.value.forEach(({ year, groups }) => {
      groups.forEach(() => {
        const x = flatIndex * effectiveItemWidth - currentScrollX
        if (x + effectiveItemWidth >= 0 && x <= canvasWidth.value) {
          ctx.save()
          ctx.font = `${14 * globalScale}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          // Apply a neat shadow for the year labels.
          ctx.shadowColor = 'rgba(0,0,0,0.2)'
          ctx.shadowBlur = 2
          ctx.shadowOffsetX = 1
          ctx.shadowOffsetY = 1
          ctx.fillStyle = '#000'
          ctx.fillText(
            `${year}`,
            x + (effectiveItemWidth - 10) / 2,
            layout.laneY + layout.yearLaneHeight / 2,
          )
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

  const drawArrowIndicators = (
    ctx: CanvasRenderingContext2D,
    layout: ReturnType<typeof getLayoutParams>,
    globalScale: number,
  ) => {
    const centerX = canvasWidth.value / 2
    const arrowWidth = 20 * globalScale
    const arrowHeight = 10 * globalScale
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
    drawArrow(layout.laneY + layout.yearLaneHeight / 2 - 14 * globalScale)
    drawArrow(layout.rowHeight + layout.laneY + layout.yearLaneHeight / 2 - 14 * globalScale)
    ctx.restore()
  }

  let animationFrameId: number
  let currentScrollX = scrollX.value
  let targetScrollX = scrollX.value

  const drawCanvas = () => {
    if (!scrollCanvas.value) return
    const ctx = scrollCanvas.value.getContext('2d')
    if (!ctx) return

    // Clear hit areas each frame.
    hitAreas.length = 0

    const globalScale = getScaleFactor()
    const effectiveItemWidth = itemWidth * globalScale + EFFECTIVE_WIDTH_OFFSET
    const totalColumns = groupedItems.value.reduce((sum, yg) => sum + yg.groups.length, 0)
    const timelineFullWidth = totalColumns * effectiveItemWidth
    const maxScrollX = Math.max(0, timelineFullWidth - canvasWidth.value)

    targetScrollX = Math.min(Math.max(scrollX.value, 0), maxScrollX)
    currentScrollX = lerp(currentScrollX, targetScrollX, 0.1)
    if (Math.abs(currentScrollX - targetScrollX) < 0.5) {
      currentScrollX = targetScrollX
    }

    const layout = getLayoutParams(globalScale)
    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

    let flatColumnIndex = 0
    groupedItems.value.forEach((yearGroup) => {
      yearGroup.groups.forEach((groupColumn) => {
        const x = flatColumnIndex * effectiveItemWidth - currentScrollX
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

    drawYearElements(ctx, layout, globalScale, effectiveItemWidth)
    drawArrowIndicators(ctx, layout, globalScale)

    animationFrameId = requestAnimationFrame(drawCanvas)
  }

  const updateTransforms = () => {
    const scale = getScaleFactor()
    const totalColumns = groupedItems.value.reduce((sum, yg) => sum + yg.groups.length, 0)
    const effectiveItemWidth = itemWidth * scale + EFFECTIVE_WIDTH_OFFSET
    const timelineFullWidth = totalColumns * effectiveItemWidth
    const viewportWidth = canvasWidth.value
    let indicatorWidth = (viewportWidth / timelineFullWidth) * minimapWidth
    if (indicatorWidth < MIN_INDICATOR_WIDTH) indicatorWidth = MIN_INDICATOR_WIDTH
    const leftMargin = 0
    const availableMinimapWidth = minimapWidth - 2 * leftMargin
    const indicatorLeft = leftMargin + (currentScrollX / timelineFullWidth) * availableMinimapWidth

    return { indicatorWidth, indicatorLeft }
  }

  // hitTest returns the first hit item for a given canvas coordinate.
  const hitTest = (x: number, y: number) => {
    for (const area of hitAreas) {
      if (x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height) {
        return { id: area.id, data: area.data }
      }
    }
    return null
  }

  return {
    drawCanvas,
    cancelAnimation: () => cancelAnimationFrame(animationFrameId),
    updateTransforms,
    hitTest,
    highlightItem,
    hitAreas,
  }
}
