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

  const effectiveItemWidth = itemWidth + EFFECTIVE_WIDTH_OFFSET

  const getScaleFactor = () => {
    const clampedWidth = Math.max(MIN_SCREEN_WIDTH, Math.min(canvasWidth.value, MAX_SCREEN_WIDTH))
    const ratio = (clampedWidth - MIN_SCREEN_WIDTH) / (MAX_SCREEN_WIDTH - MIN_SCREEN_WIDTH)
    return MIN_SCALE + (MAX_SCALE - MIN_SCALE) * ratio
  }

  function getLayoutParams() {
    const rowHeight = canvasHeight.value / 2
    const marginFactor = 0.05
    const trackTopMargin = canvasHeight.value * marginFactor
    const bottomMargin = 10
    const trackContentHeight = rowHeight - trackTopMargin - bottomMargin
    const itemHeight = GROUP_ITEM_HEIGHT * 4
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

  const FADE_INITIAL_SCALE = 0.5
  const FADE_FINAL_SCALE = 1.0
  const FADE_TRANSLATE_X = 20
  const FADE_TRANSLATE_Y = 30

  const fadeProgress = new Map<string, number>()
  function updateFadeProgress(itemId: string) {
    let progress = fadeProgress.get(itemId) ?? 0
    progress = Math.min(1, progress + 0.01)
    fadeProgress.set(itemId, progress)
    const alpha = progress
    const fadeScale = FADE_INITIAL_SCALE + progress * (FADE_FINAL_SCALE - FADE_INITIAL_SCALE)
    const offsetX = (1 - progress) * FADE_TRANSLATE_X
    const offsetY = (1 - progress) * -FADE_TRANSLATE_Y
    return { alpha, fadeScale, offsetX, offsetY }
  }

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

  function clipText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    let txt = text || ''
    if (ctx.measureText(txt).width <= maxWidth) return txt
    while (ctx.measureText(txt + '...').width > maxWidth && txt.length > 0) {
      txt = txt.slice(0, -1)
    }
    return txt + '...'
  }

  function drawYearLanes(
    ctx: CanvasRenderingContext2D,
    layout: ReturnType<typeof getLayoutParams>,
  ) {
    ctx.save()
    ctx.fillStyle = 'white'
    ctx.fillRect(0, layout.laneY_local, canvasWidth.value, layout.yearLaneHeight)
    ctx.restore()

    ctx.save()
    ctx.translate(0, layout.rowHeight)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, layout.laneY_local, canvasWidth.value, layout.yearLaneHeight)
    ctx.restore()
  }

  function drawYearLabels(
    ctx: CanvasRenderingContext2D,
    globalScale: number,
    layout: ReturnType<typeof getLayoutParams>,
  ) {
    let flatIndex = 0
    groupedItems.value.forEach((yearGroup) => {
      yearGroup.groups.forEach(() => {
        const x = flatIndex * effectiveItemWidth - scrollX.value
        if (x + effectiveItemWidth < 0 || x > canvasWidth.value) {
          flatIndex++
          return
        }
        ctx.save()
        ctx.font = `${BASE_FONT_SIZE * globalScale}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#000'
        ctx.fillText(
          String(yearGroup.year),
          x + (effectiveItemWidth - 10) / 2,
          layout.laneY_local + layout.yearLaneHeight / 2,
        )
        ctx.fillText(
          String(yearGroup.year) + ' C.E.',
          x + (effectiveItemWidth - 10) / 2,
          layout.rowHeight + layout.laneY_local + layout.yearLaneHeight / 2,
        )
        ctx.restore()
        flatIndex++
      })
    })
  }

  function drawArrowIndicators(
    ctx: CanvasRenderingContext2D,
    layout: ReturnType<typeof getLayoutParams>,
  ) {
    const centerX = canvasWidth.value / 2
    const ARROW_WIDTH = 20
    const ARROW_HEIGHT = 10

    ctx.save()
    ctx.fillStyle = 'white'
    ctx.beginPath()
    const arrowCenterY1 = layout.laneY_local + layout.yearLaneHeight / 2 - 14
    ctx.moveTo(centerX, arrowCenterY1 - ARROW_HEIGHT / 2)
    ctx.lineTo(centerX - ARROW_WIDTH / 2, arrowCenterY1 + ARROW_HEIGHT / 2)
    ctx.lineTo(centerX + ARROW_WIDTH / 2, arrowCenterY1 + ARROW_HEIGHT / 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.fillStyle = 'white'
    ctx.beginPath()
    const arrowCenterY2 = layout.rowHeight + layout.laneY_local + layout.yearLaneHeight / 2 - 14
    ctx.moveTo(centerX, arrowCenterY2 - ARROW_HEIGHT / 2)
    ctx.lineTo(centerX - ARROW_WIDTH / 2, arrowCenterY2 + ARROW_HEIGHT / 2)
    ctx.lineTo(centerX + ARROW_WIDTH / 2, arrowCenterY2 + ARROW_HEIGHT / 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  let animationFrameId: number

  function drawCanvas() {
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
          const drawTrack = (
            items: typeof groupColumn.tamil,
            trackOffsetY: number,
            getTitle: (item: (typeof items)[0]) => string,
          ) => {
            if (!items.length) return
            ctx.save()
            ctx.translate(x, trackOffsetY)

            if (items.length === 1) {
              const item = items[0]
              const titleText = getTitle(item)
              const { alpha, fadeScale, offsetX, offsetY } = updateFadeProgress(String(item.id))
              ctx.globalAlpha = alpha
              ctx.save()
              applyFadeTransform(ctx, fadeScale, offsetX, offsetY)
              ctx.fillStyle = 'rgba(255,255,255,0.8)'
              ctx.fillRect(0, layout.itemY_local, effectiveItemWidth - 10, layout.itemHeight)
              ctx.fillStyle = '#000'
              ctx.font = `bold ${BASE_FONT_SIZE * globalScale}px sans-serif`
              wrapText(
                ctx,
                titleText,
                TEXT_MARGIN,
                layout.itemY_local + SINGLE_ITEM_TEXT_Y_OFFSET,
                effectiveItemWidth - 20,
                LINE_HEIGHT_MULTIPLIER * globalScale,
              )
              ctx.restore()
            } else {
              const groupCount = items.length
              const startY = layout.itemY_local + layout.itemHeight - groupCount * GROUP_ITEM_HEIGHT
              items.forEach((item, i) => {
                ctx.save()
                const y = startY + i * GROUP_ITEM_HEIGHT
                const { alpha, fadeScale, offsetX, offsetY } = updateFadeProgress(String(item.id))
                ctx.globalAlpha = alpha
                applyFadeTransform(ctx, fadeScale, offsetX, offsetY)
                ctx.fillStyle = 'rgba(255,255,255,0.8)'
                ctx.fillRect(0, y, effectiveItemWidth - 10, GROUP_ITEM_HEIGHT)
                ctx.fillStyle = '#000'
                ctx.font = `bold ${BASE_FONT_SIZE * globalScale}px sans-serif`
                ctx.textAlign = 'left'
                ctx.textBaseline = 'middle'
                const clippedTitle = clipText(
                  ctx,
                  getTitle(item),
                  effectiveItemWidth - 2 * TEXT_MARGIN,
                )
                ctx.fillText(clippedTitle, TEXT_MARGIN, y + GROUP_ITEM_HEIGHT / 2)
                ctx.restore()
              })
            }
            ctx.restore()
          }

          drawTrack(groupColumn.tamil, 0, (item) => item.tamil_heading || '')
          drawTrack(groupColumn.world, layout.rowHeight, (item) => item.english_heading || '')
        }
        flatColumnIndex++
      })
    })

    drawYearLanes(ctx, layout)
    drawYearLabels(ctx, globalScale, layout)
    drawArrowIndicators(ctx, layout)

    animationFrameId = requestAnimationFrame(drawCanvas)
  }

  return {
    drawCanvas,
    cancelAnimation: () => cancelAnimationFrame(animationFrameId),
  }
}
