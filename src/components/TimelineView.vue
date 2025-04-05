<template>
  <div class="main">
    <!-- Scrollable content using RecycleScroller -->
    <div ref="scrollContainer" class="scroll-container">
      <div class="bottom-content">
        <div class="items-row">
          <RecycleScroller
            :buffer="50"
            ref="recycleScroller"
            class="scroller"
            :items="items"
            :item-size="itemWidth"
            direction="horizontal"
            key-field="id"
            v-slot="{ item }"
          >
            <div class="item" :class="{ 'hidden-item': !categoryFilter[item.category] }">
              <h3>{{ item.english_heading }}</h3>
              <p>{{ item.english_long_text }}</p>
              <p>{{ item.year_ce }}</p>
            </div>
          </RecycleScroller>
        </div>
      </div>
    </div>

    <!-- Fixed minimap container (always equals viewport width) -->
    <div class="minimap-container">
      <div
        ref="minimap"
        class="minimap"
        @click="onMinimapClick"
        :style="{ width: minimapWidth + 'px' }"
      >
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

    <!-- Fixed arrow element -->
    <div class="fixed-arrow"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { getItems, type Item } from '@/services/dataService'
import { RecycleScroller } from 'vue-virtual-scroller'

export default defineComponent({
  name: 'HorizontalTimeline',
  components: { RecycleScroller },
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
    const itemWidth = 200 // Each item is 200px wide

    // Total content width based on the number of items.
    const totalContentWidth = computed(() => items.value.length * itemWidth)

    // The minimap width is fixed to the viewport width.
    const minimapWidth = ref(window.innerWidth)

    // Category filter setup.
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

    // Update the minimap width to always equal the viewport.
    const updateMinimapWidth = () => {
      minimapWidth.value = window.innerWidth
      updateTransforms()
    }

    // Convert vertical wheel events to horizontal scrolling.
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (recycleScroller.value) {
        const scrollStep = 8
        const newScrollLeft = recycleScroller.value.scrollLeft + e.deltaY * scrollStep
        recycleScroller.value.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
      }
    }

    // Variables for dragging the scroll container.
    let isDragging = false,
      startX = 0,
      startScrollLeft = 0
    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('minimap-indicator')) return
      isDragging = true
      startX = e.clientX
      if (recycleScroller.value && scrollContainer.value) {
        startScrollLeft = recycleScroller.value.scrollLeft
        scrollContainer.value.classList.add('dragging')
      }
      document.body.classList.add('no-select')
    }
    const onMouseUp = () => {
      isDragging = false
      scrollContainer.value?.classList.remove('dragging')
      document.body.classList.remove('no-select')
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !recycleScroller.value) return
      e.preventDefault()
      const dx = e.clientX - startX
      recycleScroller.value.scrollTo({ left: startScrollLeft - dx, behavior: 'auto' })
    }

    // Update the indicator's size and position.
    const updateTransforms = () => {
      // Do not update if the indicator is being dragged.
      if (isIndicatorDragging.value) return
      if (!recycleScroller.value) return
      const container = recycleScroller.value
      const viewportWidth = container.clientWidth
      const scrollLeft = container.scrollLeft
      const totalWidth = totalContentWidth.value

      // Calculate indicator width as the fraction of content visible.
      const visibleRatio = viewportWidth / totalWidth
      const indicatorWidth = minimapWidth.value * visibleRatio - 10
      // Indicator left position is proportional to scrollLeft.
      const indicatorLeft = (scrollLeft / totalWidth) * minimapWidth.value

      minimapIndicatorStyle.value = {
        width: indicatorWidth + 'px',
        left: indicatorLeft + 'px',
      }
    }

    // Timeline ticks based on the items’ year_ce.
    const timelineTicks = computed(() => {
      if (!items.value.length) return []
      const leftMargin = 20,
        rightMargin = 20
      const availableWidth = minimapWidth.value - leftMargin - rightMargin
      const years = items.value.map((item) => Number(item.year_ce))
      const minYear = Math.min(...years)
      const maxYear = Math.max(...years)
      const span = maxYear - minYear || 1
      const majorTickInterval = 500,
        mediumTickInterval = 250,
        minorTickInterval = 50
      const startTick = Math.floor(minYear / minorTickInterval) * minorTickInterval
      const ticks = []
      for (let year = startTick; year <= maxYear; year += minorTickInterval) {
        let type: 'major' | 'medium' | 'minor' = 'minor'
        if (year % majorTickInterval === 0) {
          type = 'major'
        } else if (year % mediumTickInterval === 0) {
          type = 'medium'
        }
        const left = leftMargin + ((year - minYear) / span) * availableWidth
        ticks.push({ year, left, type })
      }
      return ticks
    })

    // Minimap rectangles for each item.
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
      if (!items.value.length) return []
      return items.value.map((item, index) => {
        // Each item's left on the minimap.
        const left = ((index * itemWidth) / totalContentWidth.value) * minimapWidth.value
        const rowIndex = index % totalRows
        const top = 35 + rowIndex * 4
        const catIndex = categories.value.indexOf(item.category)
        const color = colorPalette[catIndex % colorPalette.length]
        return {
          left,
          top,
          color,
          title: item.english_heading,
          category: item.category,
        }
      })
    })

    // When clicking on the minimap (outside the indicator), scroll so that the clicked point is centered.
    const onMinimapClick = (e: MouseEvent) => {
      if (isIndicatorDragging.value) return
      if (!recycleScroller.value || !minimap.value) return
      const leftMargin = 20,
        rightMargin = 20
      const availableWidth = minimapWidth.value - leftMargin - rightMargin
      const minimapRect = minimap.value.getBoundingClientRect()
      const clickX = e.clientX - minimapRect.left
      const adjustedClickX = Math.max(0, Math.min(clickX - leftMargin, availableWidth))
      const targetScroll =
        (adjustedClickX / availableWidth) * totalContentWidth.value -
        recycleScroller.value.clientWidth / 2
      const clampedScroll = Math.max(
        0,
        Math.min(targetScroll, totalContentWidth.value - recycleScroller.value.clientWidth),
      )
      recycleScroller.value.scrollTo({ left: clampedScroll, behavior: 'smooth' })
    }

    // Dragging the indicator.
    let initialDragX = 0
    let initialIndicatorLeft = 0

    const onMinimapIndicatorMouseDown = (e: MouseEvent) => {
      e.stopPropagation()
      isIndicatorDragging.value = true
      // Capture the initial mouse position and current indicator left (which is relative to the available area)
      initialDragX = e.clientX
      initialIndicatorLeft = parseFloat(minimapIndicatorStyle.value.left) || 0
      document.addEventListener('mousemove', onMinimapIndicatorMouseMove)
      document.addEventListener('mouseup', onMinimapIndicatorMouseUp)
      document.body.classList.add('no-select')
    }

    const onMinimapIndicatorMouseMove = (e: MouseEvent) => {
      if (!isIndicatorDragging.value || !minimap.value || !recycleScroller.value) return
      e.preventDefault()
      const leftMargin = 20,
        rightMargin = 20
      const availableWidth = minimapWidth.value - leftMargin - rightMargin
      // Calculate new indicator position based on the initial positions and mouse movement.
      let newLeft = initialIndicatorLeft + (e.clientX - initialDragX)
      newLeft = Math.max(0, Math.min(newLeft, availableWidth))
      minimapIndicatorStyle.value.left = newLeft + 'px'
      // Set scroll position without any extra offset.
      const newScrollLeft = (newLeft / availableWidth) * totalContentWidth.value
      recycleScroller.value.scrollTo({ left: newScrollLeft, behavior: 'auto' })
    }

    const onMinimapIndicatorMouseUp = () => {
      isIndicatorDragging.value = false
      document.removeEventListener('mousemove', onMinimapIndicatorMouseMove)
      document.removeEventListener('mouseup', onMinimapIndicatorMouseUp)
      document.body.classList.remove('no-select')
    }

    onMounted(async () => {
      items.value = await getItems()
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
      window.addEventListener('resize', updateMinimapWidth)
      nextTick(() => {
        updateMinimapWidth()
        const itemElements = Array.from(document.querySelectorAll('.item')) as HTMLElement[]
        itemElements.forEach((el) => el.classList.add('no-transition'))
        setTimeout(() => {
          updateTransforms()
          itemElements.forEach((el) => el.classList.remove('no-transition'))
        }, 50)
      })
    })
    onUnmounted(() => {
      recycleScroller.value?.removeEventListener('wheel', handleWheel)
      recycleScroller.value?.removeEventListener('scroll', updateTransforms)
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('resize', updateMinimapWidth)
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
.scroll-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 120px; /* Space for minimap and filters */
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
.bottom-content {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 100%;
  padding-bottom: 10px;
}
.items-row {
  display: flex;
  flex-direction: row;
}
.item {
  width: 200px;
  height: 300px;
  border: 1px solid var(--color-border);
  box-sizing: border-box;
  background-color: var(--color-background);
  color: var(--color-text);
  flex-shrink: 0;
}
.item.no-transition {
  transition: none;
}
.item h3 {
  color: var(--color-heading);
  margin-bottom: 5px;
}
.hidden-item {
  visibility: hidden;
}
.scroller {
  height: 400px;
  width: 100%;
  outline: 1px solid red;
}
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
.minimap {
  height: 90px;
  background-color: var(--color-background-soft);
  cursor: pointer;
  position: relative;
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
}
.minimap-items {
  position: absolute;
  top: 20px;
  left: 0;
  width: 100%;
  height: 70px;
  pointer-events: none;
}
.minimap-rectangle {
  position: absolute;
  width: 8px;
  height: 3px;
}
.minimap-indicator {
  position: absolute;
  height: 100%;
  box-sizing: border-box;
  background-color: rgba(255, 255, 255, 0.1);
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
  background-color: white;
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
  border: 2px solid white;
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
  background-color: rgba(255, 255, 255, 0.3);
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

.tick-label {
  position: relative;
  left: -50%;
}
</style>
