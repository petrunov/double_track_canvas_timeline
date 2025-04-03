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
        <div class="timeline-row no-select">
          <div v-for="(item, index) in items" :key="index" class="timeline-item">
            {{ item.year_ce }}
          </div>
          <div class="timeline-spacer"></div>
        </div>
      </div>
    </div>
    <!-- Fixed minimap at the bottom -->
    <div class="minimap" @click="onMinimapClick">
      <!-- Clustered markers based on event dates -->
      <div class="minimap-indicators">
        <div
          v-for="(marker, index) in itemIndicators"
          :key="index"
          class="minimap-marker"
          :style="{
            left: marker.left + 'px',
            width: marker.count > 1 ? '10px' : '6px',
            height: marker.count > 1 ? '10px' : '6px',
            marginLeft: marker.count > 1 ? '-5px' : '-3px',
          }"
        ></div>
      </div>
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
import { defineComponent, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { getItems, type Item } from '@/services/dataService'

export default defineComponent({
  name: 'HorizontalTimeline',
  setup() {
    const items = ref<Item[]>([])
    const scrollContainer = ref<HTMLElement | null>(null)
    const minimapIndicatorStyle = ref<{ width: string; left: string }>({
      width: '0px',
      left: '0px',
    })
    // Reactive boolean for indicator dragging state.
    const isIndicatorDragging = ref(false)

    // Reactive array for clustered markers on the minimap.
    const itemIndicators = ref<{ left: number; count: number }[]>([])

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
      // Prevent drag conflicts with the minimap indicator.
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

    // Update transforms for item animations and the minimap indicator.
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

      // Update the minimap indicator only if not dragging or frozen.
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
        // Check if the scroll has nearly caught up with the target.
        if (Math.abs(scrollLeft - indicatorTargetScrollLeft.value) < 5) {
          freezeIndicator.value = false
          updateTransforms()
        }
      }

      // ----- Compute Markers Based on Chronological Data -----
      if (items.value.length) {
        const years = items.value.map((item) => Number(item.year_ce))
        const minYear = Math.min(...years)
        const maxYear = Math.max(...years)
        const rawMarkers: number[] = items.value.map((item) => {
          if (maxYear === minYear) return containerWidth / 2
          return ((Number(item.year_ce) - minYear) / (maxYear - minYear)) * containerWidth
        })

        rawMarkers.sort((a, b) => a - b)

        const clusters: { left: number; count: number }[] = []
        const threshold = 10
        if (rawMarkers.length > 0) {
          let clusterSum = rawMarkers[0]
          let count = 1

          for (let i = 1; i < rawMarkers.length; i++) {
            if (rawMarkers[i] - rawMarkers[i - 1] <= threshold) {
              clusterSum += rawMarkers[i]
              count++
            } else {
              clusters.push({ left: clusterSum / count, count })
              clusterSum = rawMarkers[i]
              count = 1
            }
          }
          clusters.push({ left: clusterSum / count, count })
        }
        itemIndicators.value = clusters
      }
    }

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

    const onMinimapIndicatorMouseDown = (e: MouseEvent) => {
      e.stopPropagation()
      isIndicatorDragging.value = true
      minimapDragStartX = e.pageX
      indicatorInitialLeft = parseFloat(minimapIndicatorStyle.value.left) || 0
      document.addEventListener('mousemove', onMinimapIndicatorMouseMove)
      document.addEventListener('mouseup', onMinimapIndicatorMouseUp)
      document.body.classList.add('no-select')
    }

    let minimapDragStartX = 0
    let indicatorInitialLeft = 0

    const onMinimapIndicatorMouseMove = (e: MouseEvent) => {
      if (!isIndicatorDragging.value || !scrollContainer.value) return
      e.preventDefault()
      const dx = e.pageX - minimapDragStartX
      const containerWidth = scrollContainer.value.clientWidth
      const indicatorWidth = parseFloat(minimapIndicatorStyle.value.width) || 0
      let newLeft = indicatorInitialLeft + dx
      newLeft = Math.max(0, Math.min(newLeft, containerWidth - indicatorWidth))
      // Immediately update the indicator's style.
      minimapIndicatorStyle.value.left = newLeft + 'px'
      const totalScrollWidth = scrollContainer.value.scrollWidth
      const newScrollLeft = newLeft * (totalScrollWidth / containerWidth)
      // Update scroll without smooth behavior during drag.
      scrollContainer.value.scrollTo({ left: newScrollLeft, behavior: 'auto' })
    }

    const onMinimapIndicatorMouseUp = () => {
      isIndicatorDragging.value = false
      document.removeEventListener('mousemove', onMinimapIndicatorMouseMove)
      document.removeEventListener('mouseup', onMinimapIndicatorMouseUp)
      document.body.classList.remove('no-select')

      // When releasing the minimap indicator, freeze its style and smoothly scroll to catch up.
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
      minimapIndicatorStyle,
      itemIndicators,
      onMinimapClick,
      onMinimapIndicatorMouseDown,
      isIndicatorDragging,
    }
  },
})
</script>

<style scoped>
/* Main container fills the viewport */
.main {
  position: relative;
  height: 100vh;
  overflow: hidden;
}

/* Scroll container from top to 90px above bottom (timeline is inside it) */
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
  /* Default cursor for scroll container */
  cursor: default;
}

.scroll-container.dragging {
  scroll-behavior: auto;
  cursor: move;
}

.scroll-container::-webkit-scrollbar {
  display: none;
}

/* Bottom-content container to hold items & timeline, aligned at the bottom */
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
  /* Disable text selection for timeline row */
  user-select: none;
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

/* Fixed minimap at the bottom */
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
}

/* Container for the markers */
.minimap-indicators {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* Marker dots */
.minimap-marker {
  position: absolute;
  top: 50%;
  background-color: var(--color-heading);
  border-radius: 50%;
  transform: translateY(-50%);
}

/* Scroll indicator should appear above markers */
.minimap-indicator {
  position: absolute;
  top: 0;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.2);
  cursor: grab;
  z-index: 12;
}

/* When minimap indicator is being dragged */
.minimap-indicator.dragging-indicator {
  cursor: grabbing;
}

/* Fixed arrow above the minimap */
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

/* Disable text selection when dragging */
.no-select {
  user-select: none;
}
</style>
