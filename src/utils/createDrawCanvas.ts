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
) {
  const EFFECTIVE_WIDTH_OFFSET = 2
  const GROUP_ITEM_HEIGHT = 30
  const TEXT_MARGIN = 5
  const BASE_FONT_SIZE = 14
  const LINE_HEIGHT_MULTIPLIER = 20
  const SINGLE_ITEM_TEXT_Y_OFFSET = 30
  const MIN_SCREEN_WIDTH = 320
  const MAX_SCREEN_WIDTH = 1920
  const MIN_SCALE = 0.8
  const MAX_SCALE = 1.2
  const FADE_INITIAL_SCALE = 0.5
  const FADE_FINAL_SCALE = 1.0
  const FADE_TRANSLATE_X = 20
  const FADE_TRANSLATE_Y = 30
  const ARROW_WIDTH = 20
  const ARROW_HEIGHT = 10
  const effectiveItemWidth = itemWidth + EFFECTIVE_WIDTH_OFFSET
  const fadeProgress = new Map<string, number>()

  const getScaleFactor = () => {
    const clampedWidth = Math.max(MIN_SCREEN_WIDTH, Math.min(canvasWidth.value, MAX_SCREEN_WIDTH))
    const ratio = (clampedWidth - MIN_SCREEN_WIDTH) / (MAX_SCREEN_WIDTH - MIN_SCREEN_WIDTH)
    return MIN_SCALE + (MAX_SCALE - MIN_SCALE) * ratio
  }

  function getLayoutParams() {
    const rowHeight = canvasHeight.value / 2
    const trackTopMargin = canvasHeight.value * 0.05
    const bottomMargin = 10
    const trackContentHeight = rowHeight - trackTopMargin - bottomMargin
    const itemHeight = GROUP_ITEM_HEIGHT * 4
    const yearLaneHeight = 20
    const laneY = trackTopMargin + trackContentHeight - yearLaneHeight
    const itemY = laneY - 20 - itemHeight
    return {
      rowHeight,
      trackTopMargin,
      bottomMargin,
      trackContentHeight,
      itemHeight,
      yearLaneHeight,
      laneY,
      itemY,
    }
  }

  const updateFadeProgress = (itemId: string) => {
    const progress = Math.min(1, (fadeProgress.get(itemId) ?? 0) + 0.01)
    fadeProgress.set(itemId, progress)
    const alpha = progress
    const fadeScale = FADE_INITIAL_SCALE + progress * (FADE_FINAL_SCALE - FADE_INITIAL_SCALE)
    const offsetX = (1 - progress) * FADE_TRANSLATE_X
    const offsetY = (1 - progress) * -FADE_TRANSLATE_Y
    return { alpha, fadeScale, offsetX, offsetY }
  }

  const applyFadeTransform = (
    ctx: CanvasRenderingContext2D,
    fadeScale: number,
    offsetX: number,
    offsetY: number,
  ) => {
    ctx.translate(effectiveItemWidth, 0)
    ctx.scale(fadeScale, fadeScale)
    ctx.translate(-effectiveItemWidth, 0)
    ctx.translate(offsetX, offsetY)
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
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = '#000'
    ctx.font = `bold ${BASE_FONT_SIZE * globalScale}px sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    if (isMulti) {
      const clippedTitle = clipText(ctx, text, width - 2 * TEXT_MARGIN)
      ctx.fillText(clippedTitle, x + TEXT_MARGIN, y + height / 2)
    } else {
      wrapText(
        ctx,
        text,
        x + TEXT_MARGIN,
        y + SINGLE_ITEM_TEXT_Y_OFFSET,
        width - 2 * TEXT_MARGIN,
        LINE_HEIGHT_MULTIPLIER * globalScale,
      )
    }
  }

  const drawTrack = (
    ctx: CanvasRenderingContext2D,
    items: { id: string; tamil_heading?: string; english_heading?: string }[],
    offsetX: number,
    offsetY: number,
    globalScale: number,
    layout: ReturnType<typeof getLayoutParams>,
    getTitle: (item: { id: string; tamil_heading?: string; english_heading?: string }) => string,
  ) => {
    if (!items.length) return
    ctx.save()
    ctx.translate(offsetX, offsetY)
    const startY =
      items.length === 1
        ? layout.itemY
        : layout.itemY + layout.itemHeight - items.length * GROUP_ITEM_HEIGHT
    items.forEach((item, i) => {
      const y = items.length === 1 ? startY : startY + i * GROUP_ITEM_HEIGHT
      const { alpha, fadeScale, offsetX, offsetY } = updateFadeProgress(String(item.id))
      ctx.save()
      ctx.globalAlpha = alpha
      applyFadeTransform(ctx, fadeScale, offsetX, offsetY)
      drawRectWithText(
        ctx,
        getTitle(item),
        0,
        y,
        effectiveItemWidth - 10,
        items.length === 1 ? layout.itemHeight : GROUP_ITEM_HEIGHT,
        globalScale,
        items.length > 1,
      )
      ctx.restore()
    })
    ctx.restore()
  }

  const drawYearElements = (
    ctx: CanvasRenderingContext2D,
    layout: ReturnType<typeof getLayoutParams>,
    globalScale: number,
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
        const x = flatIndex * effectiveItemWidth - scrollX.value
        if (x + effectiveItemWidth >= 0 && x <= canvasWidth.value) {
          ctx.save()
          ctx.font = `${BASE_FONT_SIZE * globalScale}px sans-serif`
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
  ) => {
    const centerX = canvasWidth.value / 2
    const drawArrow = (y: number) => {
      ctx.beginPath()
      ctx.moveTo(centerX, y - ARROW_HEIGHT / 2)
      ctx.lineTo(centerX - ARROW_WIDTH / 2, y + ARROW_HEIGHT / 2)
      ctx.lineTo(centerX + ARROW_WIDTH / 2, y + ARROW_HEIGHT / 2)
      ctx.closePath()
      ctx.fill()
    }
    ctx.save()
    ctx.fillStyle = 'white'
    drawArrow(layout.laneY + layout.yearLaneHeight / 2 - 14)
    drawArrow(layout.rowHeight + layout.laneY + layout.yearLaneHeight / 2 - 14)
    ctx.restore()
  }

  let animationFrameId: number
  const drawCanvas = () => {
    if (!scrollCanvas.value) return
    const ctx = scrollCanvas.value.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
    const globalScale = getScaleFactor()
    const layout = getLayoutParams()

    let flatColumnIndex = 0
    groupedItems.value.forEach((yearGroup) => {
      yearGroup.groups.forEach((groupColumn) => {
        const x = flatColumnIndex * effectiveItemWidth - scrollX.value
        if (x + effectiveItemWidth >= 0 && x <= canvasWidth.value) {
          drawTrack(
            ctx,
            groupColumn.tamil,
            x,
            0,
            globalScale,
            layout,
            (item) => item.tamil_heading || '',
          )
          drawTrack(
            ctx,
            groupColumn.world,
            x,
            layout.rowHeight,
            globalScale,
            layout,
            (item) => item.english_heading || '',
          )
        }
        flatColumnIndex++
      })
    })

    drawYearElements(ctx, layout, globalScale)
    drawArrowIndicators(ctx, layout)

    animationFrameId = requestAnimationFrame(drawCanvas)
  }

  return {
    drawCanvas,
    cancelAnimation: () => cancelAnimationFrame(animationFrameId),
  }
}
