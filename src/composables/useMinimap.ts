// src/composables/useMinimap.ts
import { ref } from 'vue'
import { computeIndicatorStyle } from '@/utils/minimapCalculations'

export function useMinimap(
  canvasWidth: number,
  totalContentWidth: number,
  minimapWidth: number,
  margin: number = 0,
) {
  const isIndicatorDragging = ref(false)
  const indicatorStyle = ref({ width: '0px', left: '0px' })

  /**
   * Update the indicator style based on the current scroll.
   */
  function updateIndicator(scrollX: number) {
    const { indicatorWidth, indicatorLeft } = computeIndicatorStyle(
      scrollX,
      canvasWidth,
      totalContentWidth,
      minimapWidth,
      margin,
    )
    indicatorStyle.value = {
      width: `${indicatorWidth}px`,
      left: `${indicatorLeft}px`,
    }
  }

  /**
   * Called when a mousedown event occurs on the indicator.
   */
  function onIndicatorMouseDown(e: MouseEvent) {
    isIndicatorDragging.value = true
    document.addEventListener('mousemove', onIndicatorMouseMove)
    document.addEventListener('mouseup', onIndicatorMouseUp)
    e.stopPropagation()
  }

  /**
   * Handle mousemove events during indicator dragging.
   */
  function onIndicatorMouseMove(e: MouseEvent) {
    if (!isIndicatorDragging.value) return
    const container = document.querySelector('.minimap-container') as HTMLElement
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    // Calculate the x-position relative to the container (consider margin).
    const clickX = e.clientX - containerRect.left - margin

    // Get the current indicator width (recalculate using scrollX = 0 for base width)
    const { indicatorWidth } = computeIndicatorStyle(
      0,
      canvasWidth,
      totalContentWidth,
      minimapWidth,
      margin,
    )
    const availableTravel = minimapWidth - margin * 2 - indicatorWidth

    // Clamp the new indicator left value
    const newIndicatorLeft = Math.max(0, Math.min(clickX - indicatorWidth / 2, availableTravel))
    const scrollRatio = newIndicatorLeft / availableTravel
    const newScrollX = scrollRatio * (totalContentWidth - canvasWidth)
    updateIndicator(newScrollX)

    // Optionally: Emit newScrollX here via an event or callback.
    // For now, this composable only updates the indicator style.
  }

  /**
   * Ends the dragging behavior.
   */
  function onIndicatorMouseUp() {
    isIndicatorDragging.value = false
    document.removeEventListener('mousemove', onIndicatorMouseMove)
    document.removeEventListener('mouseup', onIndicatorMouseUp)
  }

  return {
    isIndicatorDragging,
    indicatorStyle,
    updateIndicator,
    onIndicatorMouseDown,
  }
}
