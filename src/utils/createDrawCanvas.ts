// src/utils/createDrawCanvas.ts
import type { Ref } from 'vue'
import type { Item } from '@/services/dataService'

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
    // Top margin relative to canvas height (e.g., 5%)
    const marginFactor = 0.05
    const trackTopMargin = canvasHeight.value * marginFactor
    const bottomMargin = 10
    // Effective content height for each track
    const trackContentHeight = rowHeight - trackTopMargin - bottomMargin
    // Items are half of the effective content height
    const itemHeight = trackContentHeight / 2

    const yearLaneHeight = 204

    // Compute local coordinates (for each track):
    // Local Y position for the lane (drawn at the bottom of the content area)
    const laneY_local = trackTopMargin + trackContentHeight - yearLaneHeight
    // Local Y position for the item so that its bottom is 20px above the lane
    const itemY_local = laneY_local - 20 - itemHeight

    // ------------------------
    // Phase 1: Draw the Items
    // ------------------------
    items.value.forEach((item, index) => {
      // Calculate x-position relative to virtual scroll
      const x = index * itemWidth - scrollX.value
      if (x + itemWidth < 0 || x > canvasWidth.value) return

      ctx.save()
      ctx.translate(x, 0)

      // First Track: Show only items that are not world items.
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

      // Second Track: Show only items that are not tamil items (i.e. world items).
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
    // First track year lane using local coordinate:
    ctx.save()
    ctx.fillStyle = 'white'
    ctx.fillRect(0, laneY_local, canvasWidth.value, yearLaneHeight)
    ctx.restore()

    // Second track: translate by rowHeight and draw the same lane.
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
      // For second track, add rowHeight to the lane position
      ctx.fillText(
        item.year_ce + ' C.E.',
        (itemWidth - 10) / 2,
        rowHeight + laneY_local + yearLaneHeight / 2,
      )
      ctx.restore()
    })

    // Request the next animation frame
    animationFrameId = requestAnimationFrame(drawCanvas)
  }

  return {
    drawCanvas,
    cancelAnimation: () => cancelAnimationFrame(animationFrameId),
  }
}
