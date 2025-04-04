<template>
  <div class="main">
    <!-- Scrollable content: Items & Timeline aligned at bottom -->
    <div ref="scrollContainer" class="scroll-container">
      <div class="bottom-content">
        <!-- Items Row -->
        <div class="items-row">
          <div v-for="(item, index) in items" :key="index" class="item">
            <h3>{{ item.english_heading }}</h3>
            <p>{{ item.english_long_text }}</p>
          </div>
        </div>
        <!-- Timeline Row -->
        <div class="timeline-row">
          <div v-for="(item, index) in items" :key="index" class="timeline-item">
            {{ item.year_ce }}
          </div>
          <div class="timeline-spacer"></div>
        </div>
      </div>
    </div>
    <!-- Fixed minimap at the bottom -->
    <div ref="minimap" class="minimap" @click="onMinimapClick">
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
      <!-- New minimap items as colored rectangles -->
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
          }"
        ></div>
      </div>
      <!-- Draggable indicator (unchanged) -->
      <div
        class="minimap-indicator"
        :class="{ 'dragging-indicator': isIndicatorDragging }"
        :style="minimapIndicatorStyle"
        @mousedown="onMinimapIndicatorMouseDown"
        @click.stop
      ></div>
    </div>
    <!-- Fixed arrow element above the minimap -->
    <div class="fixed-arrow"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { getItems, type Item } from '@/services/dataService'

export default defineComponent({
  name: 'HorizontalTimeline',
  setup() {
    const items = ref<Item[]>([])
    const scrollContainer = ref<HTMLElement | null>(null)
    const minimap = ref<HTMLElement | null>(null)
    const minimapIndicatorStyle = ref<{ width: string; left: string }>({
      width: '0px',
      left: '0px',
    })
    const isIndicatorDragging = ref(false)

    // Animation offsets for items.
    const initialX = 150
    const initialY = -550
    const finalX = 0
    const finalY = 0

    // For freezing the minimap indicator after dragging.
    const freezeIndicator = ref(false)
    const indicatorTargetScrollLeft = ref(0)

    // Convert vertical wheel events to horizontal scrolling.
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (scrollContainer.value) {
        const scrollStep = 2
        const newScrollLeft = scrollContainer.value.scrollLeft + e.deltaY * scrollStep
        scrollContainer.value.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
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
      if (scrollContainer.value) {
        startScrollLeft = scrollContainer.value.scrollLeft
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
      if (!isDragging || !scrollContainer.value) return
      e.preventDefault()
      const dx = e.pageX - startX
      scrollContainer.value.scrollLeft = startScrollLeft - dx
    }

    // Update transforms for item animations and minimap indicator.
    const updateTransforms = () => {
      if (!scrollContainer.value) return
      const container = scrollContainer.value
      const containerWidth = container.clientWidth
      const scrollLeft = container.scrollLeft

      // Update each item's transform.
      const itemsElements = document.querySelectorAll('.item')
      itemsElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          const transitionRange = containerWidth / 4
          const itemLeft = el.offsetLeft
          let progress = (scrollLeft + containerWidth - itemLeft) / transitionRange
          progress = Math.min(1, Math.max(0, progress))
          if (itemLeft < scrollLeft) {
            el.style.transform = `translate(${finalX}%, ${finalY}%)`
          } else {
            const translateX = initialX * (1 - progress) + finalX * progress
            const translateY = initialY * (1 - progress) + finalY * progress
            el.style.transform = `translate(${translateX}%, ${translateY}%)`
          }
        }
      })

      // Update minimap indicator if not dragging or frozen.
      if (!isIndicatorDragging.value && !freezeIndicator.value) {
        const totalScrollWidth = container.scrollWidth
        const visibleRatio = containerWidth / totalScrollWidth
        const indicatorWidth = containerWidth * visibleRatio
        const indicatorLeft = scrollLeft * (containerWidth / totalScrollWidth)
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
      const minimapWidth = minimap.value ? minimap.value.clientWidth : window.innerWidth
      const availableWidth = minimapWidth - leftMargin - rightMargin
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
        const left = leftMargin + ((year - minYear) / span) * availableWidth
        ticks.push({ year, left, type })
      }
      return ticks
    })

    // New computed property for minimap rectangles.
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
      if (!items.value.length || !minimap.value) return []
      const years = items.value.map((item) => Number(item.year_ce))
      const minYear = Math.min(...years)
      const maxYear = Math.max(...years)
      const minimapElement = minimap.value
      const leftMargin = 10
      const rightMargin = 10
      const minimapWidth = minimapElement.clientWidth
      const availableWidth = minimapWidth - leftMargin - rightMargin
      const span = maxYear - minYear || 1

      return items.value.map((item, index) => {
        const year = Number(item.year_ce)
        const left = leftMargin + ((year - minYear) / span) * availableWidth
        const rowIndex = index % totalRows
        const rowHeight = 10
        const top = 25 + rowIndex * rowHeight
        const color = colorPalette[index % colorPalette.length]
        return {
          left,
          top,
          color,
          title: item.english_heading,
        }
      })
    })

    // Handle clicks on the minimap.
    const onMinimapClick = (e: MouseEvent) => {
      if (!scrollContainer.value) return
      const minimapElement = e.currentTarget as HTMLElement
      const minimapRect = minimapElement.getBoundingClientRect()
      const clickX = e.clientX - minimapRect.left
      const minimapWidth = minimapElement.clientWidth
      const ratio = clickX / minimapWidth
      const container = scrollContainer.value
      const totalScrollWidth = container.scrollWidth
      const containerWidth = container.clientWidth
      const newScrollLeft = ratio * totalScrollWidth - containerWidth / 2
      container.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
    }

    // Dragging for the minimap indicator.
    let minimapDragStartX = 0
    let indicatorInitialLeft = 0

    const onMinimapIndicatorMouseDown = (e: MouseEvent) => {
      e.stopPropagation()
      isIndicatorDragging.value = true
      minimapDragStartX = e.pageX
      indicatorInitialLeft = parseFloat(minimapIndicatorStyle.value.left) || 0
      document.addEventListener('mousemove', onMinimapIndicatorMouseMove)
      document.addEventListener('mouseup', onMinimapIndicatorMouseUp)
      document.body.classList.add('no-select')
    }

    const onMinimapIndicatorMouseMove = (e: MouseEvent) => {
      if (!isIndicatorDragging.value || !scrollContainer.value) return
      e.preventDefault()
      const dx = e.pageX - minimapDragStartX
      const containerWidth = scrollContainer.value.clientWidth
      const indicatorWidth = parseFloat(minimapIndicatorStyle.value.width) || 0
      let newLeft = indicatorInitialLeft + dx
      newLeft = Math.max(0, Math.min(newLeft, containerWidth - indicatorWidth))
      minimapIndicatorStyle.value.left = newLeft + 'px'
      const totalScrollWidth = scrollContainer.value.scrollWidth
      const newScrollLeft = newLeft * (totalScrollWidth / containerWidth)
      scrollContainer.value.scrollTo({ left: newScrollLeft, behavior: 'auto' })
    }

    const onMinimapIndicatorMouseUp = () => {
      isIndicatorDragging.value = false
      document.removeEventListener('mousemove', onMinimapIndicatorMouseMove)
      document.removeEventListener('mouseup', onMinimapIndicatorMouseUp)
      document.body.classList.remove('no-select')
      if (scrollContainer.value) {
        const containerWidth = scrollContainer.value.clientWidth
        const totalScrollWidth = scrollContainer.value.scrollWidth
        const indicatorLeft = parseFloat(minimapIndicatorStyle.value.left) || 0
        indicatorTargetScrollLeft.value = indicatorLeft * (totalScrollWidth / containerWidth)
        freezeIndicator.value = true
        scrollContainer.value.scrollTo({
          left: indicatorTargetScrollLeft.value,
          behavior: 'smooth',
        })
      }
    }

    onMounted(async () => {
      items.value = await getItems()
      if (scrollContainer.value) {
        scrollContainer.value.addEventListener('wheel', handleWheel, { passive: false })
        scrollContainer.value.addEventListener('scroll', updateTransforms)
      }
      document.addEventListener('mousedown', onMouseDown)
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      nextTick(() => {
        const itemElements = Array.from(document.querySelectorAll('.item')) as HTMLElement[]
        itemElements.forEach((el) => el.classList.add('no-transition'))
        updateTransforms()
        setTimeout(() => {
          itemElements.forEach((el) => el.classList.remove('no-transition'))
        }, 50)
        window.addEventListener('resize', updateTransforms)
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
      minimapIndicatorStyle,
      isIndicatorDragging,
      timelineTicks,
      minimapRectangles,
      onMinimapClick,
      onMinimapIndicatorMouseDown,
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
  bottom: 90px;
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
  margin-right: 10px;
  box-sizing: border-box;
  padding: 10px;
  background-color: var(--color-background);
  color: var(--color-text);
  flex-shrink: 0;
  transform: translate(150%, -150%);
  transition: transform 0.5s ease-out;
}

.item.no-transition {
  transition: none;
}

.item h3 {
  color: var(--color-heading);
  margin-bottom: 5px;
}

/* Timeline Row */
.timeline-row {
  width: max-content;
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 30px;
  background-color: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
}

.timeline-item {
  width: 200px;
  padding: 0 10px;
  margin-right: 10px;
  text-align: center;
  line-height: 50px;
  flex-shrink: 0;
  color: var(--color-text);
}

.timeline-spacer {
  width: 400px;
  flex-shrink: 0;
}

/* Fixed minimap */
.minimap {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 100px;
  background-color: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
  cursor: pointer;
  z-index: 11;
  box-sizing: border-box;
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
  top: 10%;
  left: 0;
  width: 10%;
  height: 50%;
  pointer-events: none;
}

/* Each colored rectangle in the minimap */
.minimap-rectangle {
  position: absolute;
  width: 8px;
  height: 4px;
}

/* Draggable indicator */
.minimap-indicator {
  position: absolute;
  height: 100%;
  background-color: #ccc;
  opacity: 0.2;
  z-index: 12;
}

.minimap-indicator.dragging-indicator {
  cursor: grabbing;
}

/* Fixed arrow */
.fixed-arrow {
  position: fixed;
  bottom: 130px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid var(--color-heading);
  z-index: 10;
}
</style>
