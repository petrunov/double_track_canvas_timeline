// In your createDrawCanvas.ts file:
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

    // Calculate scale factor for fonts
    const scale = getScaleFactor()

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
        return
      }

      // Fade-in and transformation effects...
      // (Omitted for brevity, your original logic remains)

      // For the first track (non-world items)
      if (item.type !== 'world' && categoryFilter.value[item.category]) {
        ctx.save()
        ctx.translate(x, 0)
        // ... Apply transformation effects as needed

        // Draw background rectangle
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillRect(0, itemY_local, effectiveItemWidth - 10, itemHeight)
        // Draw top border
        // (Border drawing code remains unchanged)

        // Set font sizes based on the scale factor.
        ctx.fillStyle = '#000'
        // Use a base font size (e.g., 18px) multiplied by the scaling factor.
        ctx.font = `bold ${14 * scale}px sans-serif`
        const titleEndY = wrapText(
          ctx,
          item.tamil_heading,
          5,
          itemY_local + 30,
          effectiveItemWidth - 20,
          20 * scale,
        )
        ctx.font = `${14 * scale}px sans-serif`
        const tamilDescription =
          item.tamil_long_text.length > 47
            ? item.tamil_long_text.slice(0, 47) + '...'
            : item.tamil_long_text
        wrapText(ctx, tamilDescription, 5, titleEndY + 30, effectiveItemWidth - 20, 20 * scale)
        ctx.restore()
      }

      // For the second track (non-tamil items)
      if (item.type !== 'tamil' && categoryFilter.value[item.category]) {
        ctx.save()
        ctx.translate(x, 0)
        // ... Apply transformation effects as needed

        ctx.translate(0, rowHeight)
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillRect(0, itemY_local, effectiveItemWidth - 10, itemHeight)
        // Draw top border, etc.
        ctx.fillStyle = '#000'
        ctx.font = `bold ${14 * scale}px sans-serif`
        const titleEndY = wrapText(
          ctx,
          item.english_heading,
          5,
          itemY_local + 30,
          effectiveItemWidth - 20,
          20 * scale,
        )
        ctx.font = `${14 * scale}px sans-serif`
        const englishDescription =
          item.english_long_text.length > 47
            ? item.english_long_text.slice(0, 47) + '...'
            : item.english_long_text
        wrapText(ctx, englishDescription, 5, titleEndY + 30, effectiveItemWidth - 20, 20 * scale)
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

    // Phase 3 and Phase 4: Draw Year Labels and Arrow Indicators (similar logic)
    // When drawing text labels for years, also multiply font sizes by scale
    items.value.forEach((item, index) => {
      const x = index * effectiveItemWidth - scrollX.value
      if (x + effectiveItemWidth < 0 || x > canvasWidth.value) return
      if (item.type === 'world' || !categoryFilter.value[item.category]) return

      ctx.save()
      ctx.translate(x, 0)
      ctx.fillStyle = '#000'
      ctx.font = `${14 * scale}px sans-serif`
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
      ctx.font = `${14 * scale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        item.year_ce + ' C.E.',
        (effectiveItemWidth - 10) / 2,
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
