<template>
  <div class="main">
    <!-- Canvas for timeline rendering -->
    <canvas ref="scrollCanvas" class="scroll-canvas"></canvas>

    <!-- Fixed minimap container -->
    <div class="minimap-container" @click="onMinimapClick">
      <div ref="minimap" class="minimap" :style="{ width: minimapWidth + 'px' }">
        <!-- Timeline ticks -->
        <div class="minimap-timescale">
          <div
            v-for="(tick, index) in timelineTicks"
            :key="index"
            :class="['tick', tick.type]"
            :style="{ left: tick.left + 'px' }"
          >
            <div class="tick-mark"></div>
            <div v-if="tick.type === 'major'" class="tick-label">{{ tick.year }}</div>
          </div>
        </div>

        <!-- Minimap item markers -->
        <div class="minimap-items">
          <div
            v-for="(rect, index) in minimapRectangles"
            :key="index"
            class="minimap-rectangle"
            :title="rect.title"
            :style="{
              left: rect.left + 'px',
              top: rect.top + 'px',
              width: rect.width + 'px',
              height: rect.height + 'px',
              backgroundColor: rect.color,
              visibility: categoryFilter[rect.category] ? 'visible' : 'hidden',
            }"
          ></div>
        </div>

        <!-- Draggable indicator -->
        <div
          class="minimap-indicator"
          :class="{ 'dragging-indicator': isIndicatorDragging }"
          :style="minimapIndicatorStyle"
          @mousedown="onMinimapIndicatorMouseDown"
          @click.stop
        >
          <div class="crosshair-lines"></div>
          <div class="corner top-left"></div>
          <div class="corner top-right"></div>
          <div class="corner bottom-left"></div>
          <div class="corner bottom-right"></div>
        </div>
      </div>
    </div>

    <!-- Category filters -->
    <div class="category-filters">
      <div class="category-filter">
        <input type="checkbox" v-model="allChecked" id="check-all" />
        <label for="check-all">Check All</label>
      </div>
      <div v-for="category in categories" :key="category" class="category-filter">
        <input type="checkbox" v-model="categoryFilter[category]" :id="`cat-${category}`" />
        <label :for="`cat-${category}`">{{ category }}</label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { getItems, type Item, type YearGroup } from '@/services/dataService'
import { createDrawCanvas } from '@/utils/createDrawCanvas'

export default defineComponent({
  name: 'CanvasTimeline',
  setup() {
    // --- Canvas & Scrolling state ---
    const scrollCanvas = ref<HTMLCanvasElement | null>(null)
    const scrollX = ref(0)
    const itemWidth = 250
    const isDragging = ref(false)
    let dragStartX = 0
    let dragScrollStart = 0

    // --- Data and Items ---
    const items = ref<Item[]>([])
    const groupedItems = ref<YearGroup[]>([])
    const totalContentWidth = computed(() => items.value.length * itemWidth)

    // --- Canvas dimensions ---
    const canvasWidth = ref(window.innerWidth)
    const canvasHeight = ref(window.innerHeight - 90) // adjusted so canvas doesn't overlap minimap

    // --- Minimap State ---
    const minimap = ref<HTMLElement | null>(null)
    const minimapWidth = ref(window.innerWidth)
    const minimapIndicatorStyle = ref<{ width: string; left: string }>({
      width: '0px',
      left: '0px',
    })
    const isIndicatorDragging = ref(false)

    // --- Category Filter ---
    const categoryFilter = ref<Record<string, boolean>>({})
    const categories = computed(() => Array.from(new Set(items.value.map((item) => item.category))))
    const allChecked = computed({
      get() {
        return categories.value.every((cat) => categoryFilter.value[cat])
      },
      set(value: boolean) {
        categories.value.forEach((cat) => {
          categoryFilter.value[cat] = value
        })
      },
    })
    watch(
      () => items.value,
      () => {
        categories.value.forEach((cat) => {
          if (categoryFilter.value[cat] === undefined) {
            categoryFilter.value[cat] = true
          }
        })
      },
      { immediate: true },
    )

    // --- Text Wrapping Helper ---
    function wrapText(
      ctx: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      lineHeight: number,
    ): number {
      text = text != null ? text.toString() : ''
      const words = text.split(' ')
      let line = ''
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' '
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, x, y)
          line = words[n] + ' '
          y += lineHeight
        } else {
          line = testLine
        }
      }
      ctx.fillText(line, x, y)
      return y
    }

    // --- Create the drawing function using our separated module ---
    // Note that we pass minimapWidth.value (as a number) so that createDrawCanvas can compute indicator geometry.
    const { drawCanvas, cancelAnimation, updateTransforms } = createDrawCanvas(
      scrollCanvas,
      canvasWidth,
      canvasHeight,
      groupedItems,
      itemWidth,
      scrollX,
      categoryFilter,
      wrapText,
      minimapWidth.value,
    )

    // --- Update Canvas & Minimap dimensions ---
    const updateDimensions = () => {
      canvasWidth.value = window.innerWidth
      canvasHeight.value = window.innerHeight - 90
      minimapWidth.value = window.innerWidth
      if (scrollCanvas.value) {
        scrollCanvas.value.width = canvasWidth.value
        scrollCanvas.value.height = canvasHeight.value
      }
      // Update indicator geometry based on current scroll.
      const { indicatorWidth, indicatorLeft } = updateTransforms()
      minimapIndicatorStyle.value = {
        width: indicatorWidth + 'px',
        left: indicatorLeft + 'px',
      }
    }

    // --- Custom smooth scroll (updates scrollX) ---
    const customSmoothScrollTo = (targetScroll: number, duration: number) => {
      const startScroll = scrollX.value
      const startTime = performance.now()
      const animate = () => {
        const now = performance.now()
        const elapsed = now - startTime
        const t = Math.min(elapsed / duration, 1)
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        scrollX.value = startScroll + (targetScroll - startScroll) * eased
        const { indicatorWidth, indicatorLeft } = updateTransforms()
        minimapIndicatorStyle.value = {
          width: indicatorWidth + 'px',
          left: indicatorLeft + 'px',
        }
        if (t < 1) {
          requestAnimationFrame(animate)
        }
      }
      requestAnimationFrame(animate)
    }

    // --- Mouse wheel handling ---
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const scrollStep = 1
      const newScroll = scrollX.value + e.deltaY * scrollStep
      scrollX.value = Math.max(0, Math.min(newScroll, totalContentWidth.value - canvasWidth.value))
      const { indicatorWidth, indicatorLeft } = updateTransforms()
      minimapIndicatorStyle.value = {
        width: indicatorWidth + 'px',
        left: indicatorLeft + 'px',
      }
    }

    // --- Dragging the canvas ---
    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('minimap-indicator')) return
      isDragging.value = true
      dragStartX = e.clientX
      dragScrollStart = scrollX.value
      document.body.classList.add('no-select')
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.value) return
      const dx = e.clientX - dragStartX
      scrollX.value = Math.max(
        0,
        Math.min(dragScrollStart - dx, totalContentWidth.value - canvasWidth.value),
      )
      const { indicatorWidth, indicatorLeft } = updateTransforms()
      minimapIndicatorStyle.value = {
        width: indicatorWidth + 'px',
        left: indicatorLeft + 'px',
      }
    }
    const onMouseUp = () => {
      isDragging.value = false
      document.body.classList.remove('no-select')
    }

    // --- Get scroll position for a target year ---
    const getScrollPositionForYear = (targetYear: number): number => {
      if (!items.value.length) return 0
      const closestIndex = items.value.reduce((prevIndex, currItem, index) => {
        const currYear = Number(currItem.year_ce)
        return Math.abs(currYear - targetYear) <
          Math.abs(Number(items.value[prevIndex].year_ce) - targetYear)
          ? index
          : prevIndex
      }, 0)
      const targetScroll = closestIndex * itemWidth - (canvasWidth.value - itemWidth) / 2
      return Math.max(0, Math.min(targetScroll, totalContentWidth.value - canvasWidth.value))
    }

    // --- Minimap Indicator Dragging ---
    let indicatorDragStartX = 0
    let indicatorDragged = false
    const onMinimapIndicatorMouseDown = (e: MouseEvent) => {
      e.stopPropagation()
      isIndicatorDragging.value = true
      indicatorDragStartX = e.clientX
      indicatorDragged = false
      document.addEventListener('mousemove', onMinimapIndicatorMouseMove)
      document.addEventListener('mouseup', onMinimapIndicatorMouseUp)
      document.body.classList.add('no-select')
    }
    const onMinimapIndicatorMouseMove = (e: MouseEvent) => {
      if (!isIndicatorDragging.value) return
      e.preventDefault()
      if (!indicatorDragged && Math.abs(e.clientX - indicatorDragStartX) > 5) {
        indicatorDragged = true
      }
      const leftMargin = 20,
        rightMargin = 20
      const availableWidth = minimapWidth.value - leftMargin - rightMargin
      const containerRect = (
        document.querySelector('.minimap-container') as HTMLElement
      ).getBoundingClientRect()
      const indicatorWidth = Math.max(
        (canvasWidth.value / totalContentWidth.value) * minimapWidth.value,
        10,
      )
      let newCenter = e.clientX - containerRect.left - leftMargin
      newCenter = Math.max(
        indicatorWidth / 2,
        Math.min(newCenter, availableWidth - indicatorWidth / 2),
      )
      const newIndicatorLeft = newCenter - indicatorWidth / 2 + leftMargin
      minimapIndicatorStyle.value.left = newIndicatorLeft + 'px'
      minimapIndicatorStyle.value.width = indicatorWidth + 'px'
      const years = items.value.map((item) => Number(item.year_ce))
      const minYear = Math.min(...years)
      const maxYear = Math.max(...years)
      const targetYear = minYear + (newCenter / availableWidth) * (maxYear - minYear)
      const targetScroll = getScrollPositionForYear(targetYear)
      scrollX.value = targetScroll
      const { indicatorWidth: newWidth, indicatorLeft: newLeft } = updateTransforms()
      minimapIndicatorStyle.value = {
        width: newWidth + 'px',
        left: newLeft + 'px',
      }
    }
    const onMinimapIndicatorMouseUp = () => {
      isIndicatorDragging.value = false
      document.removeEventListener('mousemove', onMinimapIndicatorMouseMove)
      document.removeEventListener('mouseup', onMinimapIndicatorMouseUp)
      document.body.classList.remove('no-select')
    }

    // --- Minimap Click ---
    const onMinimapClick = (e: MouseEvent) => {
      if (!scrollCanvas.value) return
      const minimapContainer = document.querySelector('.minimap-container') as HTMLElement
      if (!minimapContainer) return
      const containerRect = minimapContainer.getBoundingClientRect()
      let newIndicatorLeft = e.clientX - containerRect.left
      const indicatorWidth = Math.max(
        (canvasWidth.value / totalContentWidth.value) * minimapWidth.value,
        10,
      )
      newIndicatorLeft = Math.max(
        0,
        Math.min(newIndicatorLeft, minimapWidth.value - indicatorWidth),
      )
      minimapIndicatorStyle.value.left = newIndicatorLeft + 'px'
      minimapIndicatorStyle.value.width = indicatorWidth + 'px'
      const maxIndicatorTravel = minimapWidth.value - indicatorWidth
      const ratio = newIndicatorLeft / maxIndicatorTravel
      const maxScroll = totalContentWidth.value - canvasWidth.value
      const targetScroll = ratio * maxScroll
      customSmoothScrollTo(targetScroll, 500)
    }

    // --- Timeline Ticks (unchanged from before) ---
    const timelineTicks = computed(() => {
      // Use fixed left/right margins.
      const leftMargin = 20,
        rightMargin = 20
      const availableWidth = minimapWidth.value - leftMargin - rightMargin

      // Choose a fixed spacing for ticks; here we set tickSpacing to 5px,
      // which will produce twice as many ticks as a 10px spacing.
      const tickSpacing = 15
      const tickCount = Math.floor(availableWidth / tickSpacing) + 1
      const ticks = []

      for (let i = 0; i < tickCount; i++) {
        const left = leftMargin + i * tickSpacing
        // All ticks are the same style (e.g., 'minor').
        ticks.push({ left, type: 'minor' })
      }

      return ticks
    })

    // --- Color palette for minimap items ---
    const colorPalette = [
      '#f44336',
      '#e91e63',
      '#9c27b0',
      '#2196f3',
      '#4caf50',
      '#ff9800',
      '#795548',
    ]

    // --- Minimap Rectangles (using ratio-based horizontal positioning) ---
    const minimapRectangles = computed(() => {
      if (!groupedItems.value || groupedItems.value.length === 0) return []

      const minimapItemWidth = 5 // fixed width in pixels
      const gap = 1 // gap between rectangles (if needed)
      const leftMargin = 2 // left margin for minimap rectangles
      const timescaleHeight = 20 // timescale height at the top
      const minimapTotalHeight = 75 // total height for the minimap container

      const trackAreaHeight = minimapTotalHeight - timescaleHeight
      const trackHeight = trackAreaHeight / 2 // each track gets half
      const rowCount = 6 // number of rows in each track (as used previously)
      const rowHeight = trackHeight / rowCount // height for each row
      const rectHeight = 1.5 // fixed rectangle height

      const rectangles: Array<{
        left: number
        top: number
        width: number
        height: number
        color: string
        title: string
        category: string
      }> = []

      let flatColumnIndex = 0

      // Horizontal mapping
      let totalColumns = 0
      groupedItems.value.forEach((yg) => {
        totalColumns += yg.groups.length
      })
      const EFFECTIVE_WIDTH_OFFSET = 2
      const effectiveItemWidth = itemWidth + EFFECTIVE_WIDTH_OFFSET // no extra scaling in the minimap
      const fullTimelineWidth = totalColumns * effectiveItemWidth

      // Process each group (column) of grouped items.
      groupedItems.value.forEach((yearGroup) => {
        yearGroup.groups.forEach((groupColumn) => {
          const rawX = flatColumnIndex * effectiveItemWidth
          const minimapX =
            leftMargin + (rawX / fullTimelineWidth) * (minimapWidth.value - 2 * leftMargin)

          // --- Tamil Track (upper track) ---
          // Calculate inversion: if there are fewer items, push them to the bottom.
          groupColumn.tamil.forEach((item, rowIndex) => {
            const totalItems = groupColumn.tamil.length // number of items in this column
            const invertedRow = rowCount - totalItems + rowIndex
            const top = timescaleHeight + invertedRow * rowHeight - 10
            rectangles.push({
              left: minimapX,
              top,
              width: minimapItemWidth,
              height: rectHeight,
              color: (function () {
                const keys = Object.keys(categoryFilter.value).sort()
                const index = keys.indexOf(item.category)
                return colorPalette[index % colorPalette.length]
              })(),
              title: item.tamil_heading,
              category: item.category,
            })
          })

          // --- World Track (lower track) ---
          groupColumn.world.forEach((item, rowIndex) => {
            const totalItems = groupColumn.world.length
            const invertedRow = rowCount - totalItems + rowIndex
            const top = timescaleHeight + invertedRow * rowHeight + 10
            rectangles.push({
              left: minimapX,
              top,
              width: minimapItemWidth,
              height: rectHeight,
              color: (function () {
                const keys = Object.keys(categoryFilter.value).sort()
                const index = keys.indexOf(item.category)
                return colorPalette[index % colorPalette.length]
              })(),
              title: item.english_heading,
              category: item.category,
            })
          })

          flatColumnIndex++
        })
      })

      return rectangles
    })

    // --- Touch Handlers for dragging the canvas ---
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if ((e.target as HTMLElement).classList.contains('minimap-indicator')) return
      isDragging.value = true
      dragStartX = touch.clientX
      dragScrollStart = scrollX.value
      document.body.classList.add('no-select')
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.value) return
      const touch = e.touches[0]
      const dx = touch.clientX - dragStartX
      scrollX.value = Math.max(
        0,
        Math.min(dragScrollStart - dx, totalContentWidth.value - canvasWidth.value),
      )
      const { indicatorWidth, indicatorLeft } = updateTransforms()
      minimapIndicatorStyle.value = { width: indicatorWidth + 'px', left: indicatorLeft + 'px' }
    }
    const onTouchEnd = () => {
      isDragging.value = false
      document.body.classList.remove('no-select')
    }

    const onMinimapIndicatorTouchStart = (e: TouchEvent) => {
      e.stopPropagation()
      isIndicatorDragging.value = true
      indicatorDragStartX = e.touches[0].clientX
      indicatorDragged = false
      document.addEventListener('touchmove', onMinimapIndicatorTouchMove)
      document.addEventListener('touchend', onMinimapIndicatorTouchEnd)
      document.body.classList.add('no-select')
    }
    const onMinimapIndicatorTouchMove = (e: TouchEvent) => {
      if (!isIndicatorDragging.value) return
      e.preventDefault()
      const touch = e.touches[0]
      if (!indicatorDragged && Math.abs(touch.clientX - indicatorDragStartX) > 5) {
        indicatorDragged = true
      }
      const leftMargin = 20,
        rightMargin = 20
      const availableWidth = minimapWidth.value - leftMargin - rightMargin
      const containerRect = (
        document.querySelector('.minimap-container') as HTMLElement
      ).getBoundingClientRect()
      const indicatorWidth = Math.max(
        (canvasWidth.value / totalContentWidth.value) * minimapWidth.value,
        10,
      )
      let newCenter = touch.clientX - containerRect.left - leftMargin
      newCenter = Math.max(
        indicatorWidth / 2,
        Math.min(newCenter, availableWidth - indicatorWidth / 2),
      )
      const newIndicatorLeft = newCenter - indicatorWidth / 2 + leftMargin
      minimapIndicatorStyle.value.left = newIndicatorLeft + 'px'
      minimapIndicatorStyle.value.width = indicatorWidth + 'px'
      const years = items.value.map((item) => Number(item.year_ce))
      const minYear = Math.min(...years)
      const maxYear = Math.max(...years)
      const targetYear = minYear + (newCenter / availableWidth) * (maxYear - minYear)
      const targetScroll = getScrollPositionForYear(targetYear)
      scrollX.value = targetScroll
      const { indicatorWidth: newWidth, indicatorLeft: newLeft } = updateTransforms()
      minimapIndicatorStyle.value = {
        width: newWidth + 'px',
        left: newLeft + 'px',
      }
    }
    const onMinimapIndicatorTouchEnd = () => {
      isIndicatorDragging.value = false
      document.removeEventListener('touchmove', onMinimapIndicatorTouchMove)
      document.removeEventListener('touchend', onMinimapIndicatorTouchEnd)
      document.body.classList.remove('no-select')
    }

    onMounted(async () => {
      // getItems now returns both items and groupedItems.
      const result = await getItems()
      items.value = result.items
      groupedItems.value = result.groupedItems

      await nextTick()
      updateDimensions()
      drawCanvas()
      if (scrollCanvas.value) {
        scrollCanvas.value.addEventListener('wheel', onWheel, { passive: false })
        scrollCanvas.value.addEventListener('mousedown', onMouseDown)
        scrollCanvas.value.addEventListener('touchstart', onTouchStart, { passive: false })
        scrollCanvas.value.addEventListener('touchmove', onTouchMove, { passive: false })
        scrollCanvas.value.addEventListener('touchend', onTouchEnd, { passive: false })
      }
      const minimapIndicatorElement = document.querySelector('.minimap-indicator') as HTMLElement
      if (minimapIndicatorElement) {
        minimapIndicatorElement.addEventListener('touchstart', onMinimapIndicatorTouchStart, {
          passive: false,
        })
      }
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      window.addEventListener('resize', updateDimensions)
    })

    onUnmounted(() => {
      if (scrollCanvas.value) {
        scrollCanvas.value.removeEventListener('wheel', onWheel)
        scrollCanvas.value.removeEventListener('mousedown', onMouseDown)
        scrollCanvas.value.removeEventListener('touchstart', onTouchStart)
        scrollCanvas.value.removeEventListener('touchmove', onTouchMove)
        scrollCanvas.value.removeEventListener('touchend', onTouchEnd)
      }
      const minimapIndicatorElement = document.querySelector('.minimap-indicator') as HTMLElement
      if (minimapIndicatorElement) {
        minimapIndicatorElement.removeEventListener('touchstart', onMinimapIndicatorTouchStart)
      }
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('resize', updateDimensions)
      cancelAnimation()
    })

    return {
      items,
      groupedItems,
      scrollCanvas,
      minimap,
      minimapWidth,
      minimapIndicatorStyle,
      isIndicatorDragging,
      timelineTicks,
      minimapRectangles,
      onMinimapClick,
      onMinimapIndicatorMouseDown,
      categoryFilter,
      categories,
      allChecked,
      itemWidth,
    }
  },
})
</script>

<style scoped>
* {
  user-select: none !important;
}
.main {
  position: relative;
  height: 100vh;
  overflow: hidden;
}
.scroll-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background-color: var(--color-background-soft);
  background-image: url('@/assets/bg.jpg');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  cursor: default;
}
.minimap-container {
  position: fixed;
  bottom: 40px;
  left: 0;
  width: 100%;
  height: 60px;
  overflow-x: auto;
  overflow-y: hidden;
  z-index: 11;
  background-color: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
  scrollbar-width: none;
}
.minimap-container::-webkit-scrollbar {
  display: none;
}
.minimap-timescale {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  pointer-events: none;
}
.tick {
  position: absolute;
  top: 0;
}
.tick .tick-mark {
  background-color: var(--color-heading);
  width: 1px;
}
.tick.major .tick-mark {
  height: 10px;
}
.tick.medium .tick-mark {
  height: 7px;
}
.tick.minor .tick-mark {
  height: 4px;
}
.tick-label {
  font-size: 10px;
  color: var(--color-text);
  margin-top: 2px;
  white-space: nowrap;
  position: relative;
  left: -50%;
}
.minimap-rectangle {
  position: absolute;
}
.minimap-indicator {
  position: absolute;
  height: 100%;
  box-sizing: border-box;
  background-color: rgba(235, 235, 235, 0.5);
}
.minimap-indicator .crosshair-lines {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 20%;
  height: 20%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.minimap-indicator .crosshair-lines::before,
.minimap-indicator .crosshair-lines::after {
  content: '';
  position: absolute;
  background-color: var(--color-text);
}
.minimap-indicator .crosshair-lines::before {
  width: 1px;
  height: 100%;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
}
.minimap-indicator .crosshair-lines::after {
  height: 1px;
  width: 100%;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
}
.minimap-indicator .corner {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid var(--color-text);
  pointer-events: none;
}
.minimap-indicator .corner.top-left {
  top: 0;
  left: 0;
  border-right: none;
  border-bottom: none;
}
.minimap-indicator .corner.top-right {
  top: 0;
  right: 0;
  border-left: none;
  border-bottom: none;
}
.minimap-indicator .corner.bottom-left {
  bottom: 0;
  left: 0;
  border-right: none;
  border-top: none;
}
.minimap-indicator .corner.bottom-right {
  bottom: 0;
  right: 0;
  border-left: none;
  border-top: none;
}
.minimap-indicator.dragging-indicator {
  cursor: grabbing;
  background-color: rgba(235, 235, 235, 0.5);
}
.category-filters {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 40px;
  background-color: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: row;
  align-items: center;
  overflow-x: auto;
  padding: 0 10px;
  box-sizing: border-box;
  z-index: 12;
}
.category-filter {
  margin-right: 15px;
  display: flex;
  align-items: center;
}
.category-filter input {
  margin-right: 5px;
}
</style>
