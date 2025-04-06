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

  function drawCanvas() {
    if (!scrollCanvas.value) return
    const ctx = scrollCanvas.value.getContext('2d')
    if (!ctx) return

    // Clear the canvas
    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

    // Define rows (two tracks)
    const rowHeight = canvasHeight.value / 2
    // Top margin (relative to canvas height, e.g., 5%)
    const marginFactor = 0.05
    const trackTopMargin = canvasHeight.value * marginFactor
    const bottomMargin = 10
    // Effective content height for each track
    const trackContentHeight = rowHeight - trackTopMargin - bottomMargin
    // Items take half the effective content height
    const itemHeight = trackContentHeight / 2
    // Year lane height (20px)
    const yearLaneHeight = 20

    // Compute local coordinates for each track:
    // Local Y position for the lane (at bottom of content)
    const laneY_local = trackTopMargin + trackContentHeight - yearLaneHeight
    // Local Y position for the item so its bottom is 20px above the lane
    const itemY_local = laneY_local - 20 - itemHeight

    // ------------------------
    // Phase 1: Draw the Items (with fade‑in)
    // ------------------------
    items.value.forEach((item, index) => {
      // Calculate x-position relative to virtual scroll
      const x = index * itemWidth - scrollX.value
      if (x + itemWidth < 0 || x > canvasWidth.value) {
        // If item is offscreen, remove its fade progress
        fadeProgress.delete(item.id)
        return
      }

      // Get current fade opacity or initialize to 0.
      let alpha = fadeProgress.get(item.id) ?? 0
      // Increment opacity by a small value, ensuring it doesn't exceed 1.
      alpha = Math.min(1, alpha + 0.01)
      fadeProgress.set(item.id, alpha)

      ctx.save()
      ctx.translate(x, 0)
      ctx.globalAlpha = alpha

      // First Track: Show only items that are NOT world items.
      const drawFirstTrack = item.type !== 'world' && categoryFilter.value[item.category]
      if (drawFirstTrack) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillRect(0, itemY_local, itemWidth - 10, itemHeight)
        ctx.fillStyle = '#000'
        ctx.font = 'bold 14px sans-serif'
        const titleEndY = wrapText(ctx, item.tamil_heading, 5, itemY_local + 20, itemWidth - 20, 16)
        ctx.font = '12px sans-serif'
        wrapText(ctx, item.tamil_long_text, 5, titleEndY + 10, itemWidth - 20, 16)
      }

      // Second Track: Show only items that are NOT tamil items.
      const drawSecondTrack = item.type !== 'tamil' && categoryFilter.value[item.category]
      if (drawSecondTrack) {
        // Translate into second track's local coordinate system.
        ctx.translate(0, rowHeight)
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillRect(0, itemY_local, itemWidth - 10, itemHeight)
        ctx.fillStyle = '#000'
        ctx.font = 'bold 14px sans-serif'
        const titleEndY = wrapText(
          ctx,
          item.english_heading,
          5,
          itemY_local + 20,
          itemWidth - 20,
          16,
        )
        ctx.font = '12px sans-serif'
        wrapText(ctx, item.english_long_text, 5, titleEndY + 10, itemWidth - 20, 16)
      }
      ctx.restore()
    })

    // ------------------------
    // Phase 2: Draw the Year Lanes
    // ------------------------
    // First track year lane (using local coordinate)
    ctx.save()
    ctx.fillStyle = 'white'
    ctx.fillRect(0, laneY_local, canvasWidth.value, yearLaneHeight)
    ctx.restore()

    // Second track year lane (translate by rowHeight)
    ctx.save()
    ctx.translate(0, rowHeight)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, laneY_local, canvasWidth.value, yearLaneHeight)
    ctx.restore()

    // ------------------------
    // Phase 3: Draw Year Labels (for visible items)
    // ------------------------
    // First Track Year Labels
    items.value.forEach((item, index) => {
      const x = index * itemWidth - scrollX.value
      if (x + itemWidth < 0 || x > canvasWidth.value) return
      if (item.type === 'world' || !categoryFilter.value[item.category]) return

      ctx.save()
      ctx.translate(x, 0)
      ctx.fillStyle = '#000'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.year_ta, (itemWidth - 10) / 2, laneY_local + yearLaneHeight / 2)
      ctx.restore()
    })
    // Second Track Year Labels
    items.value.forEach((item, index) => {
      const x = index * itemWidth - scrollX.value
      if (x + itemWidth < 0 || x > canvasWidth.value) return
      if (item.type === 'tamil' || !categoryFilter.value[item.category]) return

      ctx.save()
      ctx.translate(x, 0)
      ctx.fillStyle = '#000'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        item.year_ce + ' C.E.',
        (itemWidth - 10) / 2,
        rowHeight + laneY_local + yearLaneHeight / 2,
      )
      ctx.restore()
    })

    // ------------------------
    // Phase 4: Draw Arrow Indicators for Year Lanes
    // ------------------------
    // Define arrow properties:
    const centerX = canvasWidth.value / 2
    const arrowWidth = 20
    const arrowHeight = 10

    // First Track Arrow:
    ctx.save()
    ctx.fillStyle = 'white'
    ctx.beginPath()
    // Place the arrow centered vertically in the first lane;
    // Adjust Y position as desired (here 14px above lane center)
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
