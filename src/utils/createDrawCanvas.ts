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
 *
 * It supports two effects:
 *  1) A ripple effect
 *  2) A pop effect
 *
 * Also supports two new parameters to control item height:
 *    - worldTrackHeightFactor
 *    - tamilTrackHeightFactor
 *
 * We now ensure:
 *   - The Tamil track sits ~10-14 px above the bottom (your minimap space).
 *   - The Tamil track takes ~66% of the "remaining" vertical space.
 *   - The World track sits above it, taking the remaining ~34%.
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
  const REFERENCE_SINGLE_ITEM_HEIGHT = 120
  const REFERENCE_MULTI_ITEM_HEIGHT = 120
  const MIN_SCREEN_WIDTH = 320
  const REFERENCE_MAX_SCREEN_WIDTH = 1920
  const MIN_INDICATOR_WIDTH = 10

  // We'll reserve this many pixels at the bottom for the minimap gap:
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
    // If your horizontal dimension is what should determine item scale:
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

  /**
   * We define a "timeline region" from y=0 to y=(canvasHeight - MINIMAP_MARGIN).
   * Then:
   *   - The bottom (Tamil) track is 66% of that region
   *   - The top (World) track is the remaining 34%
   *
   * Each track has a "year lane" near its bottom, with some margin above it
   * so items can anchor themselves.
   */
  function getLayoutParams(globalScale: number) {
    // We introduce a SHIFT constant:
    const SHIFT = 15

    // The total vertical space for the timeline, leaving a 14px gap at bottom for minimap.
    const timelineHeight = canvasHeight.value - MINIMAP_MARGIN

    // Tamil track = 66%, World track = 34%.
    const tamilTrackHeight = timelineHeight * 0.66
    const worldTrackHeight = timelineHeight - tamilTrackHeight // ~34%

    // BOTTOM (Tamil) track:
    const tamilTrackTop = worldTrackHeight
    const bottomMargin = 10
    const trackMargin = tamilTrackHeight * 0.05
    const trackContentHeight = tamilTrackHeight - trackMargin - bottomMargin
    const yearLaneHeight = 20 * globalScale

    // Place the Tamil year lane near the bottom of this region:
    const tamilLaneY = tamilTrackTop + trackMargin + trackContentHeight - yearLaneHeight
    const EXTRA_SPACE_BELOW_LANE = 20 * globalScale
    const tamilTrackAnchorY = tamilLaneY - EXTRA_SPACE_BELOW_LANE

    // TOP (World) track:
    const topMargin = worldTrackHeight * 0.05
    const topContentHeight = worldTrackHeight - topMargin - bottomMargin
    const worldLaneY = topMargin + topContentHeight - yearLaneHeight
    const worldTrackAnchorY = worldLaneY - EXTRA_SPACE_BELOW_LANE

    // Finally, add SHIFT to every y-based value to move everything down 15px.
    return {
      timelineHeight,
      yearLaneHeight,
      EXTRA_SPACE_BELOW_LANE,

      // Tamil track (shifted 15px):
      tamilTrackTop: tamilTrackTop + SHIFT,
      tamilLaneY: tamilLaneY + SHIFT,
      tamilTrackAnchorY: tamilTrackAnchorY + SHIFT,
      tamilTrackHeight,

      // World track (shifted 15px):
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

  const clipText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
    let txt = text || ''
    if (ctx.measureText(txt).width <= maxWidth) return txt
    while (ctx.measureText(txt + '...').width > maxWidth && txt.length > 0) {
      txt = txt.slice(0, -1)
    }
    return txt + '...'
  }

  // Draws one rectangular item with shadow, image, and text.
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
    const baseRatio = 60 / REFERENCE_SINGLE_ITEM_HEIGHT
    const IMAGE_SIZE = height * baseRatio

    const margin = REFERENCE_TEXT_MARGIN * globalScale
    const imageX = x + margin
    const imageY = y + (height - IMAGE_SIZE) / 2
    const TEXT_START_X = imageX + IMAGE_SIZE + margin

    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1
    ctx.fillStyle = 'rgba(255,255,255,1)'
    ctx.fillRect(x, y, width, height)
    ctx.restore()

    if (image?.complete) {
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight)
      const sx = (image.naturalWidth - cropSize) / 2
      const sy = 0
      ctx.drawImage(image, sx, sy, cropSize, cropSize, imageX, imageY, IMAGE_SIZE, IMAGE_SIZE)
    }

    ctx.fillStyle = '#000'
    ctx.font = `bold ${REFERENCE_BASE_FONT_SIZE * globalScale}px sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'

    const clippedTitle = clipText(ctx, text, width - (TEXT_START_X - x) - margin)
    ctx.fillText(clippedTitle, TEXT_START_X, y + height / 2)
  }

  // Draw a column of items, anchored at anchorY (items bottom).
  const drawTrack = (
    ctx: CanvasRenderingContext2D,
    items: { id: string; tamil_heading?: string; english_heading?: string; category?: string }[],
    offsetX: number,
    anchorY: number,
    globalScale: number,
    effectiveItemWidth: number,
    getTitle: (item: { id: string; tamil_heading?: string; english_heading?: string }) => string,
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
      const { alpha, fadeScale, offsetX: fx, offsetY: fy } = updateFadeProgress(String(item.id))

      ctx.save()
      ctx.globalAlpha = visible ? alpha : 0
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
      drawRectWithText(
        ctx,
        getTitle(item),
        0,
        topY,
        effectiveItemWidth - 10,
        rectHeight,
        globalScale,
        items.length > 1,
        image,
      )

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
        return colorPalette[index % colorPalette.length] || '#000'
      }
      ctx.fillStyle = getCategoryColor(item.category || '')
      ctx.fillRect(0, topY, effectiveItemWidth - 10, topIndicatorHeight)
      ctx.restore()

      if (visible) {
        hitAreas.push({
          id: item.id,
          x: offsetX,
          y: topY,
          width: effectiveItemWidth - 10,
          height: rectHeight,
          data: item,
        })
      }

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
          const baseColor = getCategoryColor(item.category || '')
          ctx.beginPath()
          ctx.arc(localX, topY + localY, radius, 0, Math.PI * 2)
          ctx.fillStyle = hexToRgba(baseColor, rippleAlpha)
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
      items.forEach((item, i) => {
        const topY = startY + i * (multiItemBase + gap)
        drawOneItem(item, topY, multiItemBase)
      })
    }

    ctx.restore()
  }

  // Draw background for each track's lane, plus year labels.
  const drawYearElements = (
    ctx: CanvasRenderingContext2D,
    layout: ReturnType<typeof getLayoutParams>,
    globalScale: number,
    effectiveItemWidth: number,
    currentScrollX: number,
  ) => {
    ctx.save()
    ctx.fillStyle = 'white'
    // The bottom track's lane is near layout.tamilLaneY,
    // The top track's lane is near layout.worldLaneY.

    // We'll fill a horizontal strip for each lane.
    // For clarity, you can do a single fillRect for each:
    // top lane:
    ctx.fillRect(0, layout.worldLaneY, canvasWidth.value, layout.yearLaneHeight)
    // bottom lane:
    ctx.fillRect(0, layout.tamilLaneY, canvasWidth.value, layout.yearLaneHeight)
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
          ctx.shadowColor = 'rgba(0,0,0,0.2)'
          ctx.shadowBlur = 2
          ctx.shadowOffsetX = 1
          ctx.shadowOffsetY = 1
          ctx.fillStyle = '#000'
          // Top track label:
          ctx.fillText(
            String(year),
            x + (effectiveItemWidth - 10) / 2,
            layout.worldLaneY + layout.yearLaneHeight / 2,
          )
          // Bottom track label:
          ctx.fillText(
            `${year} C.E.`,
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
    // optional arrows near lane centers:
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

    // Clear old hit areas each frame
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

        // Only draw columns if in viewport
        if (x + effectiveItemWidth >= 0 && x <= canvasWidth.value) {
          // World (top) track => anchor at layout.worldTrackAnchorY
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
          // Tamil (bottom) track => anchor at layout.tamilTrackAnchorY
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
          // remove fade progress for items not drawn
          groupColumn.world.forEach((item) => fadeProgress.delete(String(item.id)))
          groupColumn.tamil.forEach((item) => fadeProgress.delete(String(item.id)))
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
