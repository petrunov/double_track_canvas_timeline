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

// TimelineTick: only major ticks will carry a "year" property.
interface TimelineTick {
  left: number
  type: 'major' | 'minor'
  year?: number
}

interface MinimapRectangle {
  left: number
  top: number
  width: number
  height: number
  color: string
  title: string
  category: string
}

export default defineComponent({
  name: 'CanvasTimeline',
  setup() {
    const MINIMAP_MARGIN = 0

    // --- Canvas & Scrolling state ---
    const scrollCanvas = ref<HTMLCanvasElement | null>(null)
    const scrollX = ref(0)
    const itemWidth = 250
    const isDragging = ref(false)
    const isTouching = ref(false)
    let dragStartX = 0
    let dragScrollStart = 0

    // --- Variables for touch handling ---
    let initialTouchX = 0
    let initialScrollX = 0
    let lastTouchX = 0
    let lastTouchTime = 0
    let currentVelocity = 0
    let inertiaAnimationFrame: number | null = null

    // --- New variables for throttling touchmove ---
    let latestTouchX = 0
    let latestTouchTime = 0
    let updateRequested = false

    // --- Variables for mouse inertia tracking ---
    let mouseLastX = 0
    let mouseLastTime = 0
    let mouseVelocity = 0

    // --- Data and Items ---
    const items = ref<Item[]>([])
    const groupedItems = ref<YearGroup[]>([])
    const totalContentWidth = computed(() => {
      let totalColumns = 0
      groupedItems.value.forEach((yg) => {
        totalColumns += yg.groups.length
      })

      const MIN_SCREEN_WIDTH = 320
      const REFERENCE_MAX_SCREEN_WIDTH = 1920
      const clampedWidth = Math.max(
        MIN_SCREEN_WIDTH,
        Math.min(canvasWidth.value, REFERENCE_MAX_SCREEN_WIDTH),
      )
      const ratio =
        (clampedWidth - MIN_SCREEN_WIDTH) / (REFERENCE_MAX_SCREEN_WIDTH - MIN_SCREEN_WIDTH)
      const MIN_SCALE = 0.8
      const MAX_SCALE = 1.2
      const globalScale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * ratio

      const EFFECTIVE_WIDTH_OFFSET = 2
      const effectiveWidth = itemWidth * globalScale + EFFECTIVE_WIDTH_OFFSET
      return totalColumns * effectiveWidth
    })

    // --- Canvas dimensions ---
    const canvasWidth = ref(window.innerWidth)
    const canvasHeight = ref(window.innerHeight - 90)

    // --- Minimap State ---
    const minimap = ref<HTMLElement | null>(null)
    const minimapWidth = ref(window.innerWidth * 1.5)
    const minimapIndicatorStyle = ref<{ width: string; left: string }>({
      width: '0px',
      left: '0px',
    })
    const isIndicatorDragging = ref(false)

    // Variables for touch dragging the indicator
    let draggingIndicatorStartX = 0
    let initialIndicatorLeft = 0

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

    // --- Wrap Text Helper ---
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

    // Use the new canvas module. Note that we assign its return to canvasAPI.
    const canvasAPI = createDrawCanvas(
      scrollCanvas,
      canvasWidth,
      canvasHeight,
      groupedItems,
      itemWidth,
      scrollX,
      categoryFilter,
      wrapText,
      minimapWidth.value,
      0.5, // worldTrackHeightFactor
      1.0, // tamilTrackHeightFactor
    )
    // --- Timeline Ticks ---
    const timelineTicks = computed<TimelineTick[]>(() => {
      const leftMargin = MINIMAP_MARGIN,
        rightMargin = MINIMAP_MARGIN
      const availableWidth = minimapWidth.value - leftMargin - rightMargin
      const tickSpacing = 15
      const tickCount = Math.floor(availableWidth / tickSpacing) + 1
      const ticks: TimelineTick[] = []

      // Compute min and max year from the items (if available), otherwise default values.
      const years = items.value.map((item) => Number(item.year_ce))
      const minYear = years.length ? Math.min(...years) : 1900
      const maxYear = years.length ? Math.max(...years) : 2000

      for (let i = 0; i < tickCount; i++) {
        const left = leftMargin + i * tickSpacing
        // Only every 10th tick is "major" (showing a label), others remain minor.
        if (i % 10 === 0) {
          const ratio = i / (tickCount - 1)
          const year = Math.round(minYear + ratio * (maxYear - minYear))
          ticks.push({ left, type: 'major', year })
        } else {
          ticks.push({ left, type: 'minor' })
        }
      }
      return ticks
    })

    // --- Minimap Rectangles ---
    const colorPalette = [
      '#f44336',
      '#e91e63',
      '#9c27b0',
      '#2196f3',
      '#4caf50',
      '#ff9800',
      '#795548',
    ]
    const minimapRectangles = computed<MinimapRectangle[]>(() => {
      if (!groupedItems.value || groupedItems.value.length === 0) return []
      const minimapItemWidth = 5
      const leftMargin = 3
      const timescaleHeight = 20
      const minimapTotalHeight = 75

      const trackAreaHeight = minimapTotalHeight - timescaleHeight
      const trackHeight = trackAreaHeight / 2
      const rowCount = 6
      const rowHeight = trackHeight / rowCount
      const rectHeight = 1.5

      const rectangles: MinimapRectangle[] = []

      let flatColumnIndex = 0
      let totalColumns = 0
      groupedItems.value.forEach((yg) => {
        totalColumns += yg.groups.length
      })
      const EFFECTIVE_WIDTH_OFFSET = 2
      const effectiveItemWidth = itemWidth + EFFECTIVE_WIDTH_OFFSET
      const fullTimelineWidth = totalColumns * effectiveItemWidth

      groupedItems.value.forEach((yearGroup) => {
        yearGroup.groups.forEach((groupColumn) => {
          const rawX = flatColumnIndex * effectiveItemWidth
          const minimapX =
            leftMargin + (rawX / fullTimelineWidth) * (minimapWidth.value - 2 * leftMargin)

          // --- Tamil Track (upper track) ---
          groupColumn.tamil.forEach((item, rowIndex) => {
            const totalItems = groupColumn.tamil.length
            const invertedRow = rowCount - totalItems + rowIndex
            const top = timescaleHeight + invertedRow * rowHeight - 10
            rectangles.push({
              left: minimapX,
              top,
              width: minimapItemWidth,
              height: rectHeight,
              color: (() => {
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
              color: (() => {
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

    // --- Helper: Compute Indicator Geometry ---
    function computeIndicatorGeometry() {
      const extendedWidth = minimapWidth.value // full extended minimap width
      const indicatorWidth = Math.max(
        (canvasWidth.value / totalContentWidth.value) * extendedWidth,
        10,
      )
      const maxScroll = totalContentWidth.value - canvasWidth.value
      const maxIndicatorTravel = extendedWidth - indicatorWidth
      const rawIndicatorLeft = maxScroll > 0 ? (scrollX.value / maxScroll) * maxIndicatorTravel : 0
      return { indicatorWidth, rawIndicatorLeft }
    }

    // --- Adjust Minimap Scroll for Parallax Effect ---
    function adjustMinimapScroll() {
      const minimapContainer = document.querySelector('.minimap-container') as HTMLElement | null
      if (!minimapContainer) return
      const extendedWidth = minimapWidth.value
      const containerWidth = minimapContainer.getBoundingClientRect().width
      const { rawIndicatorLeft, indicatorWidth } = computeIndicatorGeometry()
      const desiredScrollLeft =
        (rawIndicatorLeft / (extendedWidth - indicatorWidth)) * (extendedWidth - containerWidth)
      minimapContainer.scrollLeft = desiredScrollLeft
    }

    // --- Update Canvas & Minimap dimensions ---
    const updateDimensions = () => {
      canvasWidth.value = window.innerWidth
      canvasHeight.value = window.innerHeight - 90
      minimapWidth.value = window.innerWidth * 1.5
      if (scrollCanvas.value) {
        scrollCanvas.value.width = canvasWidth.value
        scrollCanvas.value.height = canvasHeight.value
      }
      const { indicatorWidth, rawIndicatorLeft } = computeIndicatorGeometry()
      minimapIndicatorStyle.value = {
        width: indicatorWidth + 'px',
        left: rawIndicatorLeft + 'px',
      }
      adjustMinimapScroll()
    }

    // --- Custom smooth scroll ---
    const customSmoothScrollTo = (targetScroll: number, duration: number) => {
      const startScroll = scrollX.value
      const startTime = performance.now()
      const animate = () => {
        const now = performance.now()
        const elapsed = now - startTime
        const t = Math.min(elapsed / duration, 1)
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        scrollX.value = startScroll + (targetScroll - startScroll) * eased
        const { indicatorWidth, rawIndicatorLeft } = computeIndicatorGeometry()
        minimapIndicatorStyle.value = {
          width: indicatorWidth + 'px',
          left: rawIndicatorLeft + 'px',
        }
        adjustMinimapScroll()
        if (t < 1) {
          requestAnimationFrame(animate)
        }
      }
      requestAnimationFrame(animate)
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const scrollStep = 1
      const newScroll = scrollX.value + e.deltaY * scrollStep
      scrollX.value = Math.max(0, Math.min(newScroll, totalContentWidth.value - canvasWidth.value))
      const { indicatorWidth, rawIndicatorLeft } = computeIndicatorGeometry()
      minimapIndicatorStyle.value = {
        width: indicatorWidth + 'px',
        left: rawIndicatorLeft + 'px',
      }
      adjustMinimapScroll()
    }

    // --- Mouse Handlers with Inertia ---
    const onMouseDown = (e: MouseEvent) => {
      // Skip if dragging the minimap indicator
      if ((e.target as HTMLElement).classList.contains('minimap-indicator')) return
      isDragging.value = true
      dragStartX = e.clientX
      dragScrollStart = scrollX.value
      mouseLastX = e.clientX
      mouseLastTime = performance.now()
      mouseVelocity = 0
      // Set cursor to "move" on mousedown
      if (scrollCanvas.value) {
        scrollCanvas.value.style.cursor = 'move'
      }
      document.body.classList.add('no-select')
    }

    const onMouseUp = () => {
      isDragging.value = false
      document.body.classList.remove('no-select')
      // Reset the cursor on mouseup
      if (scrollCanvas.value) {
        scrollCanvas.value.style.cursor = 'default'
      }
      if (Math.abs(mouseVelocity) > 0.1) {
        inertiaScroll(mouseVelocity * 10)
      }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.value) return
      if (scrollCanvas.value) {
        scrollCanvas.value.style.cursor = 'move'
      }

      const now = performance.now()
      const dt = now - mouseLastTime
      if (dt > 16) {
        const dx = e.clientX - mouseLastX
        mouseVelocity = dx / (dt || 1)
        mouseLastX = e.clientX
        mouseLastTime = now
      }

      const dx = e.clientX - dragStartX
      scrollX.value = Math.max(
        0,
        Math.min(dragScrollStart - dx, totalContentWidth.value - canvasWidth.value),
      )
      const { indicatorWidth, rawIndicatorLeft } = computeIndicatorGeometry()
      minimapIndicatorStyle.value = {
        width: indicatorWidth + 'px',
        left: rawIndicatorLeft + 'px',
      }
      adjustMinimapScroll()
    }

    let draggingIndicatorWidth: number | null = null

    // --- Mouse Indicator Drag ---
    const onMinimapIndicatorMouseDown = (e: MouseEvent) => {
      e.stopPropagation()
      isIndicatorDragging.value = true
      draggingIndicatorWidth = parseFloat(minimapIndicatorStyle.value.width)
      document.addEventListener('mousemove', onMinimapIndicatorMouseMove)
      document.addEventListener('mouseup', onMinimapIndicatorMouseUp)
      document.body.classList.add('no-select')
    }
    const onMinimapIndicatorMouseMove = (e: MouseEvent) => {
      if (!isIndicatorDragging.value) return
      e.preventDefault()
      const minimapContainer = document.querySelector('.minimap-container') as HTMLElement | null
      if (!minimapContainer) return
      const extendedWidth = minimapWidth.value
      const indicatorWidth =
        draggingIndicatorWidth !== null
          ? draggingIndicatorWidth
          : Math.max((canvasWidth.value / totalContentWidth.value) * extendedWidth, 10)
      const clickX = e.clientX - minimapContainer.getBoundingClientRect().left
      const extendedClickX = clickX + minimapContainer.scrollLeft
      let newExtendedIndicatorLeft = extendedClickX - indicatorWidth / 2
      newExtendedIndicatorLeft = Math.max(
        0,
        Math.min(newExtendedIndicatorLeft, extendedWidth - indicatorWidth),
      )
      minimapIndicatorStyle.value.left = newExtendedIndicatorLeft + 'px'
      const maxScroll = totalContentWidth.value - canvasWidth.value
      const maxIndicatorTravel = extendedWidth - indicatorWidth
      const ratio = newExtendedIndicatorLeft / maxIndicatorTravel
      scrollX.value = ratio * maxScroll
      adjustMinimapScroll()
    }
    const onMinimapIndicatorMouseUp = () => {
      isIndicatorDragging.value = false
      draggingIndicatorWidth = null
      document.removeEventListener('mousemove', onMinimapIndicatorMouseMove)
      document.removeEventListener('mouseup', onMinimapIndicatorMouseUp)
      document.body.classList.remove('no-select')
    }

    // --- Touch Indicator Drag for Minimap ---
    const onMinimapIndicatorTouchStart = (e: TouchEvent) => {
      e.stopPropagation()
      isIndicatorDragging.value = true
      draggingIndicatorStartX = e.touches[0].clientX
      initialIndicatorLeft = parseFloat(minimapIndicatorStyle.value.left)
      document.addEventListener('touchmove', onMinimapIndicatorTouchMove, { passive: false })
      document.addEventListener('touchend', onMinimapIndicatorTouchEnd, { passive: false })
      document.body.classList.add('no-select')
    }
    const onMinimapIndicatorTouchMove = (e: TouchEvent) => {
      if (!isIndicatorDragging.value) return
      e.preventDefault()
      const touch = e.touches[0]
      const minimapContainer = document.querySelector('.minimap-container') as HTMLElement | null
      if (!minimapContainer) return
      const extendedWidth = minimapWidth.value
      const indicatorWidth = parseFloat(minimapIndicatorStyle.value.width)
      const containerRect = minimapContainer.getBoundingClientRect()
      const extendedTouchX = touch.clientX - containerRect.left + minimapContainer.scrollLeft
      let newExtendedIndicatorLeft = extendedTouchX - indicatorWidth / 2
      newExtendedIndicatorLeft = Math.max(
        0,
        Math.min(newExtendedIndicatorLeft, extendedWidth - indicatorWidth),
      )
      minimapIndicatorStyle.value.left = newExtendedIndicatorLeft + 'px'
      const maxScroll = totalContentWidth.value - canvasWidth.value
      const maxIndicatorTravel = extendedWidth - indicatorWidth
      const ratio = newExtendedIndicatorLeft / maxIndicatorTravel
      scrollX.value = ratio * maxScroll
      adjustMinimapScroll()
    }
    const onMinimapIndicatorTouchEnd = () => {
      isIndicatorDragging.value = false
      document.removeEventListener('touchmove', onMinimapIndicatorTouchMove)
      document.removeEventListener('touchend', onMinimapIndicatorTouchEnd)
      document.body.classList.remove('no-select')
    }

    const onMinimapClick = (e: MouseEvent) => {
      if (!scrollCanvas.value) return
      const minimapContainer = document.querySelector('.minimap-container') as HTMLElement | null
      if (!minimapContainer) return
      const clickX = e.clientX - minimapContainer.getBoundingClientRect().left
      const extendedClickX = clickX + minimapContainer.scrollLeft
      const { indicatorWidth } = computeIndicatorGeometry()
      let newExtendedIndicatorLeft = extendedClickX - indicatorWidth / 2
      newExtendedIndicatorLeft = Math.max(
        0,
        Math.min(newExtendedIndicatorLeft, minimapWidth.value - indicatorWidth),
      )
      minimapIndicatorStyle.value.left = newExtendedIndicatorLeft + 'px'
      const maxIndicatorTravel = minimapWidth.value - indicatorWidth
      const ratio = newExtendedIndicatorLeft / maxIndicatorTravel
      const maxScroll = totalContentWidth.value - canvasWidth.value
      const targetScroll = ratio * maxScroll
      customSmoothScrollTo(targetScroll, 500)
    }

    // --- Modified Touch Handlers with Throttling ---
    const onTouchStart = (e: TouchEvent) => {
      if (inertiaAnimationFrame !== null) {
        cancelAnimationFrame(inertiaAnimationFrame)
        inertiaAnimationFrame = null
      }
      const touch = e.touches[0]
      isDragging.value = true
      isTouching.value = true
      initialTouchX = touch.clientX
      initialScrollX = scrollX.value
      lastTouchX = touch.clientX
      lastTouchTime = performance.now()
      currentVelocity = 0
      document.body.classList.add('no-select')
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.value || !isTouching.value) return
      e.preventDefault()
      const touch = e.touches[0]
      latestTouchX = touch.clientX
      latestTouchTime = performance.now()
      if (!updateRequested) {
        updateRequested = true
        requestAnimationFrame(processTouchMove)
      }
    }
    const processTouchMove = () => {
      updateRequested = false
      const currentTime = latestTouchTime
      const deltaX = latestTouchX - initialTouchX
      const newScroll = Math.max(
        0,
        Math.min(initialScrollX - deltaX, totalContentWidth.value - canvasWidth.value),
      )
      scrollX.value = newScroll
      const timeDelta = currentTime - lastTouchTime
      if (timeDelta > 16) {
        const moveDelta = latestTouchX - lastTouchX
        currentVelocity = moveDelta / (timeDelta || 1)
        lastTouchX = latestTouchX
        lastTouchTime = currentTime
      }
      if (timeDelta > 16) {
        const { indicatorWidth, rawIndicatorLeft } = computeIndicatorGeometry()
        minimapIndicatorStyle.value = {
          width: indicatorWidth + 'px',
          left: rawIndicatorLeft + 'px',
        }
        adjustMinimapScroll()
      }
    }

    // --- Inertia Scroll (common for touch and mouse) ---
    const deceleration = 0.015 // Adjust deceleration (pixels per ms²)
    const inertiaScroll = (initialVelocity: number) => {
      const startTime = performance.now()
      const maxScroll = totalContentWidth.value - canvasWidth.value
      const animate = (now: number) => {
        const elapsed = now - startTime
        const velocity = initialVelocity * Math.max(1 - deceleration * elapsed, 0)
        if (Math.abs(velocity) < 0.02) {
          inertiaAnimationFrame = null
          return
        }
        scrollX.value = Math.max(0, Math.min(scrollX.value - velocity * 16, maxScroll))
        const { indicatorWidth, rawIndicatorLeft } = computeIndicatorGeometry()
        minimapIndicatorStyle.value = {
          width: indicatorWidth + 'px',
          left: rawIndicatorLeft + 'px',
        }
        adjustMinimapScroll()
        inertiaAnimationFrame = requestAnimationFrame(animate)
      }
      inertiaAnimationFrame = requestAnimationFrame(animate)
    }
    const onTouchEnd = () => {
      if (!isTouching.value) return
      isDragging.value = false
      isTouching.value = false
      document.body.classList.remove('no-select')
      if (Math.abs(currentVelocity) > 0.1) {
        inertiaScroll(currentVelocity * 20)
      }
    }

    // --- Additional: Minimapa container mousemove handler ---
    const minimapMouseMoveHandler = (event: MouseEvent) => {
      const minimapContainer = document.querySelector('.minimap-container') as HTMLElement | null
      if (minimapContainer) {
        minimapContainer.style.cursor = isIndicatorDragging.value ? 'grabbing' : 'pointer'
      }
    }

    onMounted(async () => {
      const result = await getItems()
      items.value = result.items
      groupedItems.value = result.groupedItems
      await nextTick()
      updateDimensions()
      // Start the canvas drawing loop using canvasAPI.
      canvasAPI.drawCanvas()
      if (scrollCanvas.value) {
        scrollCanvas.value.addEventListener('wheel', onWheel, { passive: false })
        scrollCanvas.value.addEventListener('mousedown', onMouseDown)
        scrollCanvas.value.addEventListener('touchstart', onTouchStart, { passive: false })
        scrollCanvas.value.addEventListener('touchmove', onTouchMove, { passive: false })
        scrollCanvas.value.addEventListener('touchend', onTouchEnd, { passive: false })
        scrollCanvas.value.addEventListener('click', (event) => {
          if (!scrollCanvas.value) return
          const rect = scrollCanvas.value.getBoundingClientRect()
          const canvasX = event.clientX - rect.left
          const canvasY = event.clientY - rect.top
          const canvasRect = scrollCanvas.value!.getBoundingClientRect()
          const clickX = event.clientX - canvasRect.left
          const clickY = event.clientY - canvasRect.top
          // Use the hitTest method from canvasAPI.
          const hit = canvasAPI.hitTest(canvasX, canvasY)
          if (hit) {
            const itemArea = canvasAPI.hitAreas.find((area) => area.id === hit.id)!
            const relativeX = clickX - itemArea.x
            const relativeY = clickY - itemArea.y
            canvasAPI.highlightItem(hit.id, relativeX, relativeY)
          }
        })
        scrollCanvas.value.addEventListener('mousemove', (event: MouseEvent) => {
          const rect = scrollCanvas.value!.getBoundingClientRect()
          const canvasX = event.clientX - rect.left
          const canvasY = event.clientY - rect.top
          const hit = canvasAPI.hitTest(canvasX, canvasY)
          scrollCanvas.value!.style.cursor = hit ? 'pointer' : 'default'
        })
      }
      const minimapIndicatorElement = document.querySelector(
        '.minimap-indicator',
      ) as HTMLElement | null
      if (minimapIndicatorElement) {
        minimapIndicatorElement.addEventListener('touchstart', onMinimapIndicatorTouchStart, {
          passive: false,
        })
      }
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      window.addEventListener('resize', updateDimensions)
      const minimapContainer = document.querySelector('.minimap-container') as HTMLElement | null
      if (minimapContainer) {
        minimapContainer.addEventListener(
          'touchmove',
          (e) => {
            e.preventDefault()
          },
          { passive: false },
        )
        // Add a mousemove listener on the minimap container to update its cursor.
        minimapContainer.addEventListener('mousemove', minimapMouseMoveHandler)
      }
    })
    onUnmounted(() => {
      if (scrollCanvas.value) {
        scrollCanvas.value.removeEventListener('wheel', onWheel)
        scrollCanvas.value.removeEventListener('mousedown', onMouseDown)
        scrollCanvas.value.removeEventListener('touchstart', onTouchStart)
        scrollCanvas.value.removeEventListener('touchmove', onTouchMove)
        scrollCanvas.value.removeEventListener('touchend', onTouchEnd)
      }
      const minimapIndicatorElement = document.querySelector(
        '.minimap-indicator',
      ) as HTMLElement | null
      if (minimapIndicatorElement) {
        minimapIndicatorElement.removeEventListener('touchstart', onMinimapIndicatorTouchStart)
      }
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('resize', updateDimensions)
      const minimapContainer = document.querySelector('.minimap-container') as HTMLElement | null
      if (minimapContainer) {
        minimapContainer.removeEventListener('mousemove', minimapMouseMoveHandler)
      }
      canvasAPI.cancelAnimation()
    })
    let scheduled = false
    watch(
      () => scrollX.value,
      () => {
        if (!scheduled) {
          scheduled = true
          requestAnimationFrame(() => {
            adjustMinimapScroll()
            const parallaxFactor = 0.1
            if (scrollCanvas.value) {
              const offset = -scrollX.value * parallaxFactor
              scrollCanvas.value.style.setProperty('--bg-position', `${offset}px center`)
            }
            scheduled = false
          })
        }
      },
    )

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
      onMinimapIndicatorTouchStart,
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
  background-repeat: repeat-x;
  background-position: var(--bg-position, center);
  cursor: default;
  touch-action: none;
  transition: background-position 1s ease-out; /* smooth out changes */
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
  cursor: pointer;
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
  background-color: var(--color-text);
  width: 1px;
}
.tick.major .tick-mark {
  height: 4px;
}
.tick.medium .tick-mark {
  height: 4px;
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
  background-color: var(--color-text);
  opacity: 0.5;
  cursor: grab;
}
.minimap-indicator .crosshair-lines {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 20%;
  height: 20%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  background-color: var(--color-background-soft);
}
.minimap-indicator .crosshair-lines::before,
.minimap-indicator .crosshair-lines::after {
  content: '';
  position: absolute;
  background-color: var(--color-background-soft);
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
  border: 2px solid var(--color-background-soft);
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
