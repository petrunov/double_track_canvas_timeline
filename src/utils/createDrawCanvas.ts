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
 * createDrawCanvas is responsible for drawing the timeline on the canvas.
 * In addition to drawing, it builds an array of hitAreas with bounding boxes
 * for each drawn item so that click (or tap) events can determine which item
 * was clicked.
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
} {
  const EFFECTIVE_WIDTH_OFFSET = 2
  const REFERENCE_SINGLE_ITEM_HEIGHT = 90
  const MIN_SCREEN_WIDTH = 320
  const REFERENCE_MAX_SCREEN_WIDTH = 1920
  const MIN_INDICATOR_WIDTH = 10

  // This array will hold the bounding boxes of drawn items.
  // For performance, we only store information for items that are visible.
  const hitAreas: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
    data: any
  }> = []

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

    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillRect(x, y, width, height)

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
      const effectiveAlpha = visible ? alpha : 0
      ctx.save()
      ctx.globalAlpha = effectiveAlpha
      applyFadeTransform(ctx, fadeScale, fx, fy, globalScale, effectiveItemWidth)

      // Retrieve an image based on a hash of the id.
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

      // Record a hit area for later click detection.
      // The absolute X and Y are computed from the translated coordinates.
      const absX = offsetX // offsetX is the absolute x position (group's position).
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

    // Clear hit areas before drawing each frame.
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
          // Draw the two tracks (tamil and world) and record hit areas.
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

  // hitTest takes canvas coordinate (x, y) and returns the first hit item or null.
  const hitTest = (x: number, y: number) => {
    // For performance, you might later use a spatial index if hitAreas grows large.
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
  }
}
