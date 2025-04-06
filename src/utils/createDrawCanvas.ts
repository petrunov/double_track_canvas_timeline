// src/utils/createDrawCanvas.ts
import type { Ref } from 'vue'
import type { Item } from '@/services/dataService'

// Global Map to track fade progress for each item by its id.
const fadeProgress = new Map<string, number>()

export function createDrawCanvas(
  scrollCanvas: Ref<HTMLCanvasElement | null>,
  canvasWidth: Ref<number>,
  canvasHeight: Ref<number>,
  items: Ref<Item[]>,
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

  const colorPalette = ['#f44336', '#e91e63', '#9c27b0', '#2196f3', '#4caf50', '#ff9800', '#795548']

  function drawCanvas() {
    if (!scrollCanvas.value) return
    const ctx = scrollCanvas.value.getContext('2d')
    if (!ctx) return

    // Clear the canvas
    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

    // Calculate scale factor for fonts based on screen width.
    const globalScale = getScaleFactor()

    // Define rows (two tracks) and margins
    const rowHeight = canvasHeight.value / 2
    const marginFactor = 0.05
    const trackTopMargin = canvasHeight.value * marginFactor
    const bottomMargin = 10
    const trackContentHeight = rowHeight - trackTopMargin - bottomMargin
    const itemHeight = trackContentHeight / 3
    const yearLaneHeight = 20

    const laneY_local = trackTopMargin + trackContentHeight - yearLaneHeight
    const itemY_local = laneY_local - 20 - itemHeight

    // Phase 1: Draw Items
    items.value.forEach((item, index) => {
      const x = index * effectiveItemWidth - scrollX.value
      if (x + effectiveItemWidth < 0 || x > canvasWidth.value) {
        // Remove fade progress if the item is offscreen.
        fadeProgress.delete(item.id)
        return
      }

      // ------------------------
      // Fade‑in and transformation effects
      // ------------------------
      let progress = fadeProgress.get(item.id) ?? 0
      progress = Math.min(1, progress + 0.01)
      fadeProgress.set(item.id, progress)

      // Use the fade progress for the opacity
      const alpha = progress
      // Compute fade-specific transformation values:
      // Scale grows from 0.5 (50%) to 1 (100%)
      const fadeScale = 0.5 + progress * 0.5
      // Horizontal offset: starts 20px to the right and moves to 0.
      const offsetX = (1 - progress) * 20
      // Vertical offset: starts 30px above and falls to 0.
      const offsetY = (1 - progress) * -30

      // ------------------------
      // First Track: Items that are NOT world items.
      // ------------------------
      if (item.type !== 'world' && categoryFilter.value[item.category]) {
        ctx.save()
        ctx.translate(x, 0)
        ctx.globalAlpha = alpha
        // Apply fade-in transformation:
        ctx.translate(effectiveItemWidth, 0)
        ctx.scale(fadeScale, fadeScale)
        ctx.translate(-effectiveItemWidth, 0)
        ctx.translate(offsetX, offsetY)

        // Draw background rectangle
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillRect(0, itemY_local, effectiveItemWidth - 10, itemHeight)
        // Draw top border (if needed, add code here)

        // Draw text with font sizes scaled by the global scale factor.
        ctx.fillStyle = '#000'
        ctx.font = `bold ${14 * globalScale}px sans-serif`
        const titleEndY = wrapText(
          ctx,
          item.tamil_heading,
          5,
          itemY_local + 30,
          effectiveItemWidth - 20,
          20 * globalScale,
        )
        ctx.font = `${14 * globalScale}px sans-serif`
        const tamilDescription =
          item.tamil_long_text.length > 47
            ? item.tamil_long_text.slice(0, 47) + '...'
            : item.tamil_long_text
        wrapText(
          ctx,
          tamilDescription,
          5,
          titleEndY + 30,
          effectiveItemWidth - 20,
          20 * globalScale,
        )
        ctx.restore()
      }

      // ------------------------
      // Second Track: Items that are NOT tamil items.
      // ------------------------
      if (item.type !== 'tamil' && categoryFilter.value[item.category]) {
        ctx.save()
        ctx.translate(x, 0)
        ctx.globalAlpha = alpha
        // Apply fade-in transformation:
        ctx.translate(effectiveItemWidth, 0)
        ctx.scale(fadeScale, fadeScale)
        ctx.translate(-effectiveItemWidth, 0)
        ctx.translate(offsetX, offsetY)

        // Translate into second track’s coordinate system.
        ctx.translate(0, rowHeight)
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillRect(0, itemY_local, effectiveItemWidth - 10, itemHeight)
        // Draw top border (if needed)

        ctx.fillStyle = '#000'
        ctx.font = `bold ${14 * globalScale}px sans-serif`
        const titleEndY = wrapText(
          ctx,
          item.english_heading,
          5,
          itemY_local + 30,
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
    })

    // Phase 2: Draw Year Lanes
    ctx.save()
    ctx.fillStyle = 'white'
    ctx.fillRect(0, laneY_local, canvasWidth.value, yearLaneHeight)
    ctx.restore()

    ctx.save()
    ctx.translate(0, rowHeight)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, laneY_local, canvasWidth.value, yearLaneHeight)
    ctx.restore()

    // Phase 3: Draw Year Labels
    items.value.forEach((item, index) => {
      const x = index * effectiveItemWidth - scrollX.value
      if (x + effectiveItemWidth < 0 || x > canvasWidth.value) return
      if (item.type === 'world' || !categoryFilter.value[item.category]) return

      ctx.save()
      ctx.translate(x, 0)
      ctx.fillStyle = '#000'
      ctx.font = `${14 * globalScale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.year_ta, (effectiveItemWidth - 10) / 2, laneY_local + yearLaneHeight / 2)
      ctx.restore()
    })

    items.value.forEach((item, index) => {
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
        item.year_ce + ' C.E.',
        (effectiveItemWidth - 10) / 2,
        rowHeight + laneY_local + yearLaneHeight / 2,
      )
      ctx.restore()
    })

    // Phase 4: Draw Arrow Indicators for Year Lanes
    const centerX = canvasWidth.value / 2
    const arrowWidth = 20
    const arrowHeight = 10

    // First Track Arrow:
    ctx.save()
    ctx.fillStyle = 'white'
    ctx.beginPath()
    const arrowCenterY1 = laneY_local + yearLaneHeight / 2 - 14
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
    const arrowCenterY2 = rowHeight + laneY_local + yearLaneHeight / 2 - 14
    ctx.moveTo(centerX, arrowCenterY2 - arrowHeight / 2)
    ctx.lineTo(centerX - arrowWidth / 2, arrowCenterY2 + arrowHeight / 2)
    ctx.lineTo(centerX + arrowWidth / 2, arrowCenterY2 + arrowHeight / 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Request the next animation frame
    animationFrameId = requestAnimationFrame(drawCanvas)
  }

  return {
    drawCanvas,
    cancelAnimation: () => cancelAnimationFrame(animationFrameId),
  }
}
