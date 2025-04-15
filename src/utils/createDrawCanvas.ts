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
 * A helper to clip text on a single line with "..." if it’s too long.
 */
function clipSingleLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let clipped = text
  while (clipped.length > 0 && ctx.measureText(clipped + '...').width > maxWidth) {
    clipped = clipped.slice(0, -1)
  }
  return clipped + '...'
}

/**
 * A specialized "float left" wrapping function so text wraps around an image.
 * It draws text line by line; if a line overlaps the image vertically,
 * the text left boundary shifts to the right of the image.
 * If not all text fits in maxLines, the final allowed line gets "..." appended.
 */
function wrapTextFloatLeft(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  imgX: number,
  imgY: number,
  imgW: number,
  imgH: number,
) {
  const words = text.split(/\s+/)
  let line = ''
  let currentY = y
  let linesUsed = 0
  let i = 0

  for (i = 0; i < words.length; i++) {
    const testLine = line ? line + ' ' + words[i] : words[i]

    let lineLeft = x
    let usableWidth = maxWidth

    const lineBottom = currentY + lineHeight
    const overlapVertically = lineBottom > imgY && currentY < imgY + imgH
    if (overlapVertically) {
      const shiftLeft = imgX + imgW + 5 // 5px gap
      const shiftAmount = shiftLeft - x
      if (shiftAmount < maxWidth) {
        lineLeft = shiftLeft
        usableWidth = maxWidth - shiftAmount
      }
    }

    if (ctx.measureText(testLine).width <= usableWidth) {
      line = testLine
    } else {
      ctx.fillText(line, lineLeft, currentY)
      line = words[i]
      currentY += lineHeight
      linesUsed++
      if (linesUsed >= maxLines) return
    }
  }

  // Draw the leftover line
  if (line && linesUsed < maxLines) {
    let lineLeft = x
    const lineBottom = currentY + lineHeight
    const overlapVertically = lineBottom > imgY && currentY < imgY + imgH
    if (overlapVertically) {
      const shiftLeft = imgX + imgW + 5
      const shiftAmount = shiftLeft - x
      if (shiftAmount < maxWidth) {
        lineLeft = shiftLeft
      }
    }
    // Only modify the final line if not all words were drawn and we are on the last allowed line.
    if (i < words.length && linesUsed === maxLines - 1) {
      if (line.length >= 3) {
        line = line.slice(0, -3) + '...'
      } else {
        line = '...'
      }
    }
    ctx.fillText(line, lineLeft, currentY)
  }
}

/**
 * drawRectWithText()
 * Draws the overall rectangle for an item.
 *
 * For world items (itemHeightFactor < 1):
 *  - Draw a forced-square image filling 100% of the available height (minus margins)
 *  - Place the title to the RIGHT of the image, vertically centered.
 *
 * For Tamil items (itemHeightFactor >= 1):
 *  - Use a "float left" approach so that text (title + multi-line description)
 *    wraps around the image.
 */
function drawRectWithText(
  ctx: CanvasRenderingContext2D,
  title: string,
  description: string,
  x: number,
  y: number,
  width: number,
  height: number,
  globalScale: number,
  image: HTMLImageElement,
  itemHeightFactor: number,
  categoryColor: string,
) {
  // Draw white background rectangle with shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 1
  ctx.fillStyle = '#fff'
  ctx.fillRect(x, y, width, height)
  ctx.restore()

  // Draw category-colored bar at the top.
  const topIndicatorHeight = 5 * globalScale
  ctx.fillStyle = categoryColor
  ctx.fillRect(x, y, width, topIndicatorHeight)

  if (itemHeightFactor < 1) {
    // WORLD (smaller) items.
    const MARGIN = 6 * globalScale
    const TITLE_FONT_SIZE = 14 * globalScale

    const availableHeight = height - topIndicatorHeight - 2 * MARGIN
    const availableWidth = width - 2 * MARGIN
    let side = availableHeight
    if (side > availableWidth) {
      side = availableWidth
    }

    const imageX = x + MARGIN
    const imageY = y + topIndicatorHeight + MARGIN

    if (image?.complete) {
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight)
      const sx = (image.naturalWidth - cropSize) / 2
      const sy = 0
      ctx.drawImage(image, sx, sy, cropSize, cropSize, imageX, imageY, side, side)
    }

    // Title to the right, vertically centered relative to the square image.
    const textX = imageX + side + MARGIN
    const textMaxWidth = width - (textX - x) - MARGIN
    const textY = imageY + side / 2 - TITLE_FONT_SIZE / 2

    ctx.fillStyle = '#000'
    ctx.textBaseline = 'top'
    ctx.font = `bold ${TITLE_FONT_SIZE}px sans-serif`
    const clippedTitle = clipSingleLine(ctx, title, textMaxWidth)
    ctx.fillText(clippedTitle, textX, textY)
    return
  }

  // TAMIL (bigger) items => float left approach.
  const ITEM_TOP_PADDING = 5 * globalScale
  const MARGIN = 6 * globalScale
  const TITLE_FONT_SIZE = 14 * globalScale
  const DESC_FONT_SIZE = 12 * globalScale
  const LINE_SPACING = 18 * globalScale

  const contentY = y + ITEM_TOP_PADDING
  const baseRatio = 60 / 120
  const IMAGE_SIZE = Math.max(40, height * baseRatio)

  const imageX = x + MARGIN
  const imageY = contentY + MARGIN

  let actualImgWidth = 0,
    actualImgHeight = 0
  if (image?.complete) {
    const cropSize = Math.min(image.naturalWidth, image.naturalHeight)
    const sx = (image.naturalWidth - cropSize) / 2
    const sy = 0
    ctx.drawImage(image, sx, sy, cropSize, cropSize, imageX, imageY, IMAGE_SIZE, IMAGE_SIZE)
    actualImgWidth = IMAGE_SIZE
    actualImgHeight = IMAGE_SIZE
  }

  // Set up text area parameters.
  const textAreaX = x + MARGIN
  const textAreaY = imageY
  const textAreaWidth = width - 2 * MARGIN
  const MAX_LINES = 4

  ctx.fillStyle = '#000'
  // Step 1: Draw Title in bold.
  {
    ctx.textBaseline = 'top'
    ctx.font = `bold ${TITLE_FONT_SIZE}px sans-serif`
    let titleLineLeft = textAreaX
    const lineHeightForTitle = TITLE_FONT_SIZE + 4 * globalScale
    const lineBottom = textAreaY + lineHeightForTitle
    const overlapVert = lineBottom > imageY && textAreaY < imageY + actualImgHeight
    if (overlapVert) {
      titleLineLeft = imageX + actualImgWidth + 5
    }
    const availableForTitle = x + width - titleLineLeft - MARGIN
    const clippedT = clipSingleLine(ctx, title, availableForTitle)
    ctx.fillText(clippedT, titleLineLeft, textAreaY)
  }

  // Step 2: Draw Description with float-left wrapping.
  const descStartY = textAreaY + TITLE_FONT_SIZE + 4 * globalScale
  ctx.font = `${DESC_FONT_SIZE}px sans-serif`
  wrapTextFloatLeft(
    ctx,
    description || '',
    textAreaX,
    descStartY,
    textAreaWidth,
    LINE_SPACING,
    MAX_LINES,
    imageX,
    imageY,
    actualImgWidth,
    actualImgHeight,
  )
}

// -------------------------------------------------------------------------------------------------

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
  // New factors for controlling item height.
  worldTrackHeightFactor = 0.5,
  tamilTrackHeightFactor = 1.0,
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
  const REFERENCE_SINGLE_ITEM_HEIGHT = 100
  const REFERENCE_MULTI_ITEM_HEIGHT = 101
  const MIN_SCREEN_WIDTH = 320
  const REFERENCE_MAX_SCREEN_WIDTH = 1920
  const MIN_INDICATOR_WIDTH = 10

  const MINIMAP_MARGIN = 14

  const hitAreas: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
    data: any
  }> = []

  const clickEffects = new Map<string, ClickEffect>()
  const HIGHLIGHT_DURATION = 300

  const highlightItem = (itemId: string, clickX: number, clickY: number) => {
    clickEffects.set(itemId, { startTime: performance.now(), clickX, clickY })
  }

  function getScaleFactor() {
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
    const SHIFT = 15
    const timelineHeight = canvasHeight.value - MINIMAP_MARGIN

    const tamilTrackHeight = timelineHeight * 0.66
    const worldTrackHeight = timelineHeight - tamilTrackHeight

    const bottomMargin = 10
    const trackMargin = tamilTrackHeight * 0.05
    const trackContentHeight = tamilTrackHeight - trackMargin - bottomMargin
    const yearLaneHeight = 20 * globalScale

    const tamilTrackTop = worldTrackHeight
    const tamilLaneY = tamilTrackTop + trackMargin + trackContentHeight - yearLaneHeight
    const EXTRA_SPACE_BELOW_LANE = 20 * globalScale
    const tamilTrackAnchorY = tamilLaneY - EXTRA_SPACE_BELOW_LANE

    const topMargin = worldTrackHeight * 0.05
    const topContentHeight = worldTrackHeight - topMargin - bottomMargin
    const worldLaneY = topMargin + topContentHeight - yearLaneHeight
    const worldTrackAnchorY = worldLaneY - EXTRA_SPACE_BELOW_LANE

    return {
      timelineHeight,
      yearLaneHeight,
      EXTRA_SPACE_BELOW_LANE,
      tamilTrackTop: tamilTrackTop + SHIFT,
      tamilLaneY: tamilLaneY + SHIFT,
      tamilTrackAnchorY: tamilTrackAnchorY + SHIFT,
      tamilTrackHeight,
      worldTrackHeight,
      worldLaneY: worldLaneY + SHIFT,
      worldTrackAnchorY: worldTrackAnchorY + SHIFT,
    }
  }

  const fadeProgress = new Map<string, number>()
  const FADING_SPEED = 0.04

  const updateFadeProgress = (itemId: string) => {
    const progress = Math.min(1, (fadeProgress.get(itemId) ?? 0) + FADING_SPEED)
    fadeProgress.set(itemId, progress)

    const alpha = progress
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

  function getCategoryColor(category: string): string {
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
    return colorPalette[index % colorPalette.length] || '#000'
  }

  // Format world years with "A.D. YYYY" or "YYYY B.C."
  function formatWorldYear(year: number): string {
    return year < 0 ? Math.abs(year) + ' B.C.' : 'A.D. ' + year
  }

  /**
   * Draw a column of items, anchored at anchorY (items bottom).
   */
  const drawTrack = (
    ctx: CanvasRenderingContext2D,
    items: {
      id: string
      tamil_heading?: string
      english_heading?: string
      category?: string
      description?: string
      DetailedText_English?: string
      DetailedText_Tamil?: string
    }[],
    offsetX: number,
    anchorY: number,
    globalScale: number,
    effectiveItemWidth: number,
    getTitle: (item: any) => string,
    itemHeightFactor: number,
  ) => {
    if (!items.length) return

    const gap = 4 * globalScale
    const singleItemHeight = REFERENCE_SINGLE_ITEM_HEIGHT * globalScale * itemHeightFactor
    const multiItemBase = REFERENCE_MULTI_ITEM_HEIGHT * globalScale * itemHeightFactor

    ctx.save()
    ctx.translate(offsetX, 0)

    const drawOneItem = (item: any, topY: number, rectHeight: number) => {
      const visible = categoryFilter.value[item.category || ''] !== false
      if (!visible) return

      const description = item.english_long_text || item.description || ''
      const { alpha, fadeScale, offsetX: fx, offsetY: fy } = updateFadeProgress(String(item.id))
      ctx.save()
      ctx.globalAlpha = alpha
      applyFadeTransform(ctx, fadeScale, fx, fy, globalScale, effectiveItemWidth)

      if (clickEffects.has(item.id)) {
        const effect = clickEffects.get(item.id)!
        const elapsed = performance.now() - effect.startTime
        const progress = Math.min(1, elapsed / HIGHLIGHT_DURATION)
        const popScale = 1 + 0.1 * (1 - Math.abs(progress - 0.5) * 2.5)
        const centerX = (effectiveItemWidth - 10) / 2
        const centerY = topY + rectHeight / 2
        ctx.translate(centerX, centerY)
        ctx.scale(popScale, popScale)
        ctx.translate(-centerX, -centerY)
      }

      const image = itemImages[Math.abs(hashCode(item.id)) % itemImages.length]
      const title = getTitle(item)
      const categoryClr = getCategoryColor(item.category || '')

      drawRectWithText(
        ctx,
        title,
        description,
        0,
        topY,
        effectiveItemWidth - 10,
        rectHeight,
        globalScale,
        image,
        itemHeightFactor,
        categoryClr,
      )

      ctx.restore()

      hitAreas.push({
        id: item.id,
        x: offsetX,
        y: topY,
        width: effectiveItemWidth - 10,
        height: rectHeight,
        data: item,
      })

      if (clickEffects.has(item.id)) {
        const effect = clickEffects.get(item.id)!
        const elapsed = performance.now() - effect.startTime
        const progress = elapsed / HIGHLIGHT_DURATION
        if (progress < 1) {
          ctx.save()
          ctx.beginPath()
          ctx.rect(0, topY, effectiveItemWidth - 10, rectHeight)
          ctx.clip()

          const rectWidth = effectiveItemWidth - 10
          const localX = effect.clickX
          const localY = effect.clickY
          const dx = Math.max(localX, rectWidth - localX)
          const dy = Math.max(localY, rectHeight - localY)
          const maxRadius = Math.sqrt(dx * dx + dy * dy)
          const radius = progress * maxRadius
          const rippleAlpha = 0.3 * (1 - progress)

          ctx.beginPath()
          ctx.arc(localX, topY + localY, radius, 0, Math.PI * 2)
          ctx.fillStyle = hexToRgba(categoryClr, rippleAlpha)
          ctx.fill()
          ctx.restore()
        } else {
          clickEffects.delete(item.id)
        }
      }
    }

    if (items.length === 1) {
      const topY = anchorY - singleItemHeight
      drawOneItem(items[0], topY, singleItemHeight)
    } else {
      const totalHeight = items.length * multiItemBase + gap * (items.length - 1)
      const startY = anchorY - totalHeight
      items.forEach((itm, i) => {
        const topY = startY + i * (multiItemBase + gap)
        drawOneItem(itm, topY, multiItemBase)
      })
    }

    ctx.restore()
  }

  const drawYearElements = (
    ctx: CanvasRenderingContext2D,
    layout: ReturnType<typeof getLayoutParams>,
    globalScale: number,
    effectiveItemWidth: number,
    currentScrollX: number,
  ) => {
    ctx.save()
    ctx.fillStyle = 'white'
    ctx.fillRect(0, layout.worldLaneY, canvasWidth.value, layout.yearLaneHeight)
    ctx.fillRect(0, layout.tamilLaneY, canvasWidth.value, layout.yearLaneHeight)
    ctx.restore()

    let flatIndex = 0
    groupedItems.value.forEach(({ year, year_ta, groups }) => {
      groups.forEach(() => {
        const x = flatIndex * effectiveItemWidth - currentScrollX
        if (x + effectiveItemWidth >= 0 && x <= canvasWidth.value) {
          ctx.save()
          ctx.font = `${14 * globalScale}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.shadowColor = 'rgba(0,0,0,0.2)'
          ctx.shadowBlur = 2
          ctx.shadowOffsetX = 1
          ctx.shadowOffsetY = 1
          ctx.fillStyle = '#000'
          // For World items, use formatted year.
          ctx.fillText(
            formatWorldYear(year),
            x + (effectiveItemWidth - 10) / 2,
            layout.worldLaneY + layout.yearLaneHeight / 2,
          )
          // For Tamil items, use the Tamil year (year_ta).
          ctx.fillText(
            String(year_ta),
            x + (effectiveItemWidth - 10) / 2,
            layout.tamilLaneY + layout.yearLaneHeight / 2,
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
    drawArrow(layout.worldLaneY + layout.yearLaneHeight / 2 - 14 * globalScale)
    drawArrow(layout.tamilLaneY + layout.yearLaneHeight / 2 - 14 * globalScale)
    ctx.restore()
  }

  let animationFrameId: number
  let currentScrollX = scrollX.value
  let targetScrollX = scrollX.value

  const drawCanvas = () => {
    if (!scrollCanvas.value) return
    const ctx = scrollCanvas.value.getContext('2d')
    if (!ctx) return

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
            groupColumn.world.map((item) => ({ ...item, id: String(item.id) })),
            x,
            layout.worldTrackAnchorY,
            globalScale,
            effectiveItemWidth,
            (item) => item.english_heading || '',
            worldTrackHeightFactor,
          )
          drawTrack(
            ctx,
            groupColumn.tamil.map((item) => ({ ...item, id: String(item.id) })),
            x,
            layout.tamilTrackAnchorY,
            globalScale,
            effectiveItemWidth,
            (item) => item.tamil_heading || '',
            tamilTrackHeightFactor,
          )
        } else {
          groupColumn.world.forEach((itm) => fadeProgress.delete(String(itm.id)))
          groupColumn.tamil.forEach((itm) => fadeProgress.delete(String(itm.id)))
        }
        flatColumnIndex++
      })
    })

    drawYearElements(ctx, layout, globalScale, effectiveItemWidth, currentScrollX)
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
