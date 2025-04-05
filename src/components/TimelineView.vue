<template>
  <div class="main">
    <!-- Scrollable content: Items & Timeline aligned at bottom -->
    <div ref="scrollContainer" class="scroll-container">
      <div class="bottom-content">
        <div class="items-row">
          <RecycleScroller
            :buffer="50"
            ref="recycleScroller"
            class="scroller"
            :items="items"
            :item-size="200"
            direction="horizontal"
            key-field="id"
            v-slot="{ item }"
          >
            <div class="item" :class="{ 'hidden-item': !categoryFilter[item.category] }">
              <h3>{{ item.english_heading }}</h3>
              <p>{{ item.english_long_text }}</p>
              <p>{{ item.year_ce }}</p>
            </div>
            <div class="timeline-item" :class="{ 'hidden-item': !categoryFilter[item.category] }">
              {{ item.year_ce }}
            </div>
          </RecycleScroller>
        </div>
        <!-- Timeline Row -->
        <!-- <div class="timeline-row">
          <div
            v-for="(item, index) in items"
            :key="index"
            class="timeline-item"
            :class="{ 'hidden-item': !categoryFilter[item.category] }"
          >
            {{ item.year_ce }}
          </div>
          <div class="timeline-spacer"></div>
        </div> -->
      </div>
    </div>

    <!-- Fixed minimap container that scrolls horizontally -->
    <div class="minimap-container">
      <div
        ref="minimap"
        class="minimap"
        @click="onMinimapClick"
        :style="{ width: minimapWidth + 'px' }"
      >
        <!-- Timescale on top of the minimap -->
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

        <!-- Minimap items as colored rectangles -->
        <div class="minimap-items">
          <div
            v-for="(rect, index) in minimapRectangles"
            :key="index"
            class="minimap-rectangle"
            :title="rect.title"
            :style="{
              left: rect.left + 'px',
              top: rect.top + 'px',
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
          <!-- Crosshair plus sign in the center -->
          <div class="crosshair-lines"></div>
          <!-- Corner markers -->
          <div class="corner top-left"></div>
          <div class="corner top-right"></div>
          <div class="corner bottom-left"></div>
          <div class="corner bottom-right"></div>
        </div>
      </div>
    </div>

    <!-- Category filter row below the minimap -->
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

    <!-- Fixed arrow element above the minimap -->
    <div class="fixed-arrow"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { getItems, type Item } from '@/services/dataService'
import TimelineItems from '@/components/timeline/TimelineItems.vue'

export default defineComponent({
  name: 'HorizontalTimeline',
  components: { TimelineItems },
  setup() {
    const items = ref<Item[]>([])
    const scrollContainer = ref<HTMLElement | null>(null)
    const recycleScroller = ref<HTMLElement | null>(null)
    const minimap = ref<HTMLElement | null>(null)
    const minimapIndicatorStyle = ref<{ width: string; left: string }>({
      width: '0px',
      left: '0px',
    })
    const isIndicatorDragging = ref(false)
    const minimapWidth = ref(0)
    const minimapScale = ref(0)

    // Category filter: key is category, value is boolean.
    const categoryFilter = ref<Record<string, boolean>>({})

    // Compute distinct categories from items.
    const categories = computed(() => {
      return Array.from(new Set(items.value.map((item) => item.category)))
    })

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

    // When items are loaded, initialize the category filter.
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

    // For freezing the minimap indicator after dragging.
    const freezeIndicator = ref(false)
    const indicatorTargetScrollLeft = ref(0)

    // Convert vertical wheel events to horizontal scrolling.
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (recycleScroller.value && scrollContainer.value) {
        const scrollStep = 8
        const newScrollLeft = recycleScroller.value.scrollLeft + e.deltaY * scrollStep

        recycleScroller.value?.scrollTo({
          left: newScrollLeft,
          behavior: 'smooth',
        })
      }
    }

    // Variables for dragging the scroll container.
    let isDragging = false
    let startX = 0
    let startScrollLeft = 0

    const onMouseDown = (e: MouseEvent) => {
      // Avoid conflict with minimap indicator drag.
      if ((e.target as HTMLElement).classList.contains('minimap-indicator')) return
      isDragging = true
      startX = e.pageX
      if (scrollContainer.value && recycleScroller.value) {
        startScrollLeft = recycleScroller.value.scrollLeft
        scrollContainer.value.classList.add('dragging')
      }
      document.body.classList.add('no-select')
    }

    const onMouseUp = () => {
      isDragging = false
      if (scrollContainer.value) {
        scrollContainer.value.classList.remove('dragging')
      }
      document.body.classList.remove('no-select')
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !recycleScroller.value) return
      e.preventDefault()
      const dx = e.pageX - startX
      // scrollContainer.value.scrollLeft = startScrollLeft - dx;
      recycleScroller.value?.scrollTo({
        left: startScrollLeft - dx,
        behavior: 'auto',
      })
    }

    // Update minimap width based on content
    const updateMinimapWidth = () => {
      if (!scrollContainer.value) return

      const viewportWidth = window.innerWidth
      const contentWidth = items.value.length * 200 // Assuming each item is 200px wide

      console.log(items.value.length, contentWidth)

      // A fixed scale factor when content is wide enough
      const fixedScale = 0.04
      // If the calculated minimap width would be less than the viewport,
      // adjust the scale so that the minimap fills the viewport
      if (contentWidth * fixedScale < viewportWidth) {
        minimapScale.value = viewportWidth / contentWidth
        minimapWidth.value = viewportWidth
      } else {
        minimapScale.value = fixedScale
        minimapWidth.value = contentWidth * fixedScale
      }
    }

    // Update transforms for item animations and minimap indicator.
    const updateTransforms = () => {
      if (!scrollContainer.value) return
      if (!recycleScroller.value) return
      const container = recycleScroller.value
      const containerWidth = container.clientWidth
      const scrollLeft = container.scrollLeft

      // Update minimap scroll position (parallax effect)
      if (minimap.value && minimap.value.parentElement) {
        const totalScrollWidth = container.scrollWidth
        const minimapParent = minimap.value.parentElement
        const minimapScrollRange = minimapWidth.value - minimapParent.clientWidth

        // Create a parallax effect by using a non-linear relationship
        // between content scroll and minimap scroll
        const scrollRatio = scrollLeft / (totalScrollWidth - containerWidth)
        minimapParent.scrollLeft = scrollRatio * minimapScrollRange
      }

      // Update minimap indicator if not dragging or frozen.
      if (!isIndicatorDragging.value && !freezeIndicator.value) {
        const totalScrollWidth = container.scrollWidth
        const visibleRatio = containerWidth / totalScrollWidth
        const indicatorWidth = minimapWidth.value * visibleRatio - 5
        const indicatorLeft = (scrollLeft / totalScrollWidth) * minimapWidth.value
        minimapIndicatorStyle.value = {
          width: indicatorWidth + 'px',
          left: indicatorLeft + 'px',
        }
      } else if (freezeIndicator.value) {
        if (Math.abs(scrollLeft - indicatorTargetScrollLeft.value) < 5) {
          freezeIndicator.value = false
          updateTransforms()
        }
      }
    }

    // Computed ticks for the minimap timescale.
    const timelineTicks = computed(() => {
      if (!items.value.length) return []
      const leftMargin = 20
      const rightMargin = 20
      const availableWidth = minimapWidth.value - leftMargin - rightMargin
      const years = items.value.map((item) => Number(item.year_ce))
      const minYear = Math.min(...years)
      const maxYear = Math.max(...years)
      const span = maxYear - minYear || 1

      const majorTickInterval = 500
      const mediumTickInterval = 250
      const minorTickInterval = 50

      const startTick = Math.floor(minYear / minorTickInterval) * minorTickInterval
      const endTick = Math.ceil(maxYear / minorTickInterval) * minorTickInterval

      const ticks = []
      for (let year = startTick; year <= endTick; year += minorTickInterval) {
        let type: 'major' | 'medium' | 'minor' = 'minor'
        if (year % majorTickInterval === 0) {
          type = 'major'
        } else if (year % mediumTickInterval === 0) {
          type = 'medium'
        }
        const left = leftMargin + ((year - minYear) / span) * availableWidth - 3
        ticks.push({ year, left, type })
      }
      return ticks
    })

    // Computed property for minimap rectangles
    const totalRows = 5
    const colorPalette = [
      '#f44336',
      '#e91e63',
      '#9c27b0',
      '#2196f3',
      '#4caf50',
      '#ff9800',
      '#795548',
    ]
    const minimapRectangles = computed(() => {
      if (!items.value.length || !scrollContainer.value) return []
      if (!items.value.length || !recycleScroller.value) return []

      const years = items.value.map((item) => Number(item.year_ce))
      const minYear = Math.min(...years)
      const maxYear = Math.max(...years)
      const leftMargin = 10
      const rightMargin = 10
      const availableWidth = minimapWidth.value - leftMargin - rightMargin
      const span = maxYear - minYear || 1

      // Create a mapping of items by their position
      const itemPositions = new Map()
      items.value.forEach((item, index) => {
        // Find the actual timeline item element
        const itemElement = document.querySelector(
          `.items-row .item:nth-child(${index + 1})`,
        ) as HTMLElement
        if (itemElement) {
          itemPositions.set(item, itemElement.offsetLeft)
        }
      })

      // Calculate positions proportionally based on actual item positions
      return items.value.map((item) => {
        let left: number
        const itemLeft = itemPositions.get(item)

        if (itemLeft !== undefined) {
          // Position based on actual element position
          left = (itemLeft / recycleScroller.value!.scrollWidth) * availableWidth + leftMargin
        } else {
          // Fallback to year-based positioning
          const year = Number(item.year_ce)
          left = leftMargin + ((year - minYear) / span) * availableWidth - 5
        }

        // Create a pseudo-random row assignment that depends on the item
        // This ensures consistent positions between renders but breaks the ladder pattern
        const itemHash = item.english_heading.length + (Number(item.year_ce) % 100)
        const rowIndex = itemHash % totalRows

        // Add a small horizontal offset based on hash to stagger items further
        const horizontalOffset = (itemHash % 7) - 3 // Range from -3 to 3 pixels

        const rowHeight = 4
        const top = 35 + rowIndex * rowHeight

        // Add a small vertical jitter to break perfect horizontal alignment
        const verticalJitter = (itemHash % 5) - 2 // Range from -2 to 2 pixels

        const color = colorPalette[categories.value.indexOf(item.category) % colorPalette.length]

        return {
          left: left + horizontalOffset,
          top: top + verticalJitter,
          color,
          title: item.english_heading,
          category: item.category,
        }
      })
    })

    // Handle clicks on the minimap.
    const onMinimapClick = (e: MouseEvent) => {
      if (!recycleScroller.value || !minimap.value) return
      const minimapElement = minimap.value
      const minimapRect = minimapElement.getBoundingClientRect()
      const clickX = e.clientX - minimapRect.left
      const minimapWidth = minimapElement.clientWidth
      const ratio = clickX / minimapWidth
      const container = recycleScroller.value
      const totalScrollWidth = container.scrollWidth
      const containerWidth = container.clientWidth
      const newScrollLeft = ratio * totalScrollWidth - containerWidth / 2
      container.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
    }

    // Dragging for the minimap indicator.
    // const minimapDragStartX = 0
    // const indicatorInitialLeft = 0

    // Define a variable to store the offset between the click point and the indicator’s left edge.
    let dragOffset = 0

    const onMinimapIndicatorMouseDown = (e: MouseEvent) => {
      e.stopPropagation()
      isIndicatorDragging.value = true

      // Get the bounding rectangle of the indicator element.
      const indicatorRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      // Calculate how far inside the indicator the user clicked.
      dragOffset = e.pageX - indicatorRect.left

      document.addEventListener('mousemove', onMinimapIndicatorMouseMove)
      document.addEventListener('mouseup', onMinimapIndicatorMouseUp)
      document.body.classList.add('no-select')
    }

    const onMinimapIndicatorMouseMove = (e: MouseEvent) => {
      if (!isIndicatorDragging.value || !minimap.value || !recycleScroller.value) return
      e.preventDefault()

      // Get the minimap's bounding rect to compute relative positions.
      const minimapRect = minimap.value.getBoundingClientRect()
      const minimapWidth = minimap.value.clientWidth
      const indicatorWidth = parseFloat(minimapIndicatorStyle.value.width) || 0

      // Calculate the new left position so that the cursor’s position within the indicator is preserved.
      let newLeft = e.pageX - minimapRect.left - dragOffset
      newLeft = Math.max(0, Math.min(newLeft, minimapWidth - indicatorWidth))

      minimapIndicatorStyle.value.left = newLeft + 'px'

      // Update the scrolling position immediately.
      const totalScrollWidth = recycleScroller.value.scrollWidth
      const newScrollLeft = (newLeft / minimapWidth) * totalScrollWidth
      recycleScroller.value.scrollTo({ left: newScrollLeft, behavior: 'auto' })
    }

    const onMinimapIndicatorMouseUp = () => {
      isIndicatorDragging.value = false
      document.removeEventListener('mousemove', onMinimapIndicatorMouseMove)
      document.removeEventListener('mouseup', onMinimapIndicatorMouseUp)
      document.body.classList.remove('no-select')
      // Remove the extra scrollTo logic so that the indicator stays where the cursor is released.
    }

    onMounted(async () => {
      items.value = await getItems()

      // if (scrollContainer.value) {
      //   scrollContainer.value.addEventListener('wheel', handleWheel, { passive: false })
      //   scrollContainer.value.addEventListener('scroll', updateTransforms)
      // }
      nextTick(() => {
        recycleScroller.value = document.querySelector('.vue-recycle-scroller') as HTMLElement
        if (recycleScroller.value) {
          recycleScroller.value.addEventListener('wheel', handleWheel, { passive: false })
          recycleScroller.value.addEventListener('scroll', updateTransforms)
        }
      })

      document.addEventListener('mousedown', onMouseDown)
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)

      nextTick(() => {
        updateMinimapWidth()
        const itemElements = Array.from(document.querySelectorAll('.item')) as HTMLElement[]
        itemElements.forEach((el) => el.classList.add('no-transition'))

        // Initial delay to ensure DOM is fully rendered before positioning calculations
        setTimeout(() => {
          updateTransforms()
          itemElements.forEach((el) => el.classList.remove('no-transition'))
        }, 50)

        window.addEventListener('resize', () => {
          updateMinimapWidth()
          updateTransforms()
        })

        // Manually query for the scroller element.
        recycleScroller.value = document.querySelector('.vue-recycle-scroller') as HTMLElement
        console.log('RecycleScroller DOM element:', recycleScroller.value)
      })
    })

    onUnmounted(() => {
      if (scrollContainer.value) {
        scrollContainer.value.removeEventListener('wheel', handleWheel)
        scrollContainer.value.removeEventListener('scroll', updateTransforms)
      }
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('resize', updateTransforms)
    })

    return {
      items,
      scrollContainer,
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
    }
  },
})
</script>

<style scoped>
/* Disable all text selection in this component */
* {
  user-select: none !important;
}

/* Main container */
.main {
  position: relative;
  height: 100vh;
  overflow: hidden;
}

/* Scroll container */
.scroll-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 120px; /* Adjusted to accommodate minimap and category filters */
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  scroll-behavior: smooth;
  background-color: var(--color-background-soft);
  background-image: url('@/assets/bg.jpg');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  cursor: default;
}

.scroll-container.dragging {
  scroll-behavior: auto;
  cursor: move;
}

.scroll-container::-webkit-scrollbar {
  display: none;
}

/* Bottom-content container */
.bottom-content {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 100%;
  padding-bottom: 10px;
}

/* Items Row */
.items-row {
  display: flex;
  flex-direction: row;
}

/* Item styling */
.item {
  width: 200px;
  height: 300px;
  border: 1px solid var(--color-border);
  /* margin-right: 10px; */
  /* padding: 10px; */
  box-sizing: border-box;
  background-color: var(--color-background);
  color: var(--color-text);
  flex-shrink: 0;
  /* transform: translate(150%, -150%);
  transition: transform 0.5s ease-out; */
}

.item.no-transition {
  transition: none;
}

.item h3 {
  color: var(--color-heading);
  margin-bottom: 5px;
}

/* Hide items but preserve layout */
.hidden-item {
  visibility: hidden;
}

.scroller {
  height: 400px; /* Adjusted to match the item height */
  width: 100%;
  outline: 1px solid red;
}

/* Timeline Row */
/* .timeline-row {
  width: max-content;
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 30px;
  background-color: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
} */

.timeline-item {
  /* padding: 0 10px; */
  /* margin-right: 10px; */
  text-align: center;
  line-height: 50px;
  flex-shrink: 0;
  color: var(--color-text);
  background: red;
}

.timeline-spacer {
  width: 400px;
  flex-shrink: 0;
}

/* Minimap container for horizontal scrolling */
.minimap-container {
  position: fixed;
  bottom: 40px;
  left: 0;
  width: 100%;
  height: 90px;
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

/* Fixed minimap */
.minimap {
  height: 90px;
  background-color: var(--color-background-soft);
  cursor: pointer;
  position: relative;
}

/* Timescale on top of minimap */
.minimap-timescale {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  pointer-events: none;
}

/* Tick styling */
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
}

/* Minimap items container */
.minimap-items {
  position: absolute;
  top: 20px;
  left: 0;
  width: 100%;
  height: 70px;
  pointer-events: none;
}

/* Each colored rectangle in the minimap */
.minimap-rectangle {
  position: absolute;
  width: 8px;
  height: 3px;
}

/* Draggable indicator */
/* Updated minimap indicator styling */
.minimap-indicator {
  position: absolute;
  height: 100%;
  box-sizing: border-box;
  background-color: rgba(255, 255, 255, 0.1);
}

/* Crosshair plus sign in the center */
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
  background-color: white;
}

/* Vertical line */
.minimap-indicator .crosshair-lines::before {
  width: 1px;
  height: 100%;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
}

/* Horizontal line */
.minimap-indicator .crosshair-lines::after {
  height: 1px;
  width: 100%;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
}

/* Corner markers: small squares with borders only on the outer edges */
.minimap-indicator .corner {
  position: absolute;
  width: 10px; /* Adjust the size as needed */
  height: 10px;
  border: 2px solid white;
  pointer-events: none;
}

/* Top-left corner: show top and left borders only */
.minimap-indicator .corner.top-left {
  top: 0;
  left: 0;
  border-right: none;
  border-bottom: none;
}

/* Top-right corner: show top and right borders only */
.minimap-indicator .corner.top-right {
  top: 0;
  right: 0;
  border-left: none;
  border-bottom: none;
}

/* Bottom-left corner: show bottom and left borders only */
.minimap-indicator .corner.bottom-left {
  bottom: 0;
  left: 0;
  border-right: none;
  border-top: none;
}

/* Bottom-right corner: show bottom and right borders only */
.minimap-indicator .corner.bottom-right {
  bottom: 0;
  right: 0;
  border-left: none;
  border-top: none;
}

.minimap-indicator.dragging-indicator {
  cursor: grabbing;
  background-color: rgba(255, 255, 255, 0.3);
}

/* Category filters row */
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

/* Fixed arrow */
.fixed-arrow {
  position: fixed;
  bottom: 160px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid var(--color-background-soft);
  z-index: 10;
}
</style>
