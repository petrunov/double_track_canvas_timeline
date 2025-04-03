<template>
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
      </div>
    </div>
  </div>
  <!-- Fixed Arrow Element -->
  <div class="fixed-arrow"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { getItems, type Item } from '@/services/dataService'

export default defineComponent({
  name: 'HorizontalTimeline',
  setup() {
    const items = ref<Item[]>([])
    const scrollContainer = ref<HTMLElement | null>(null)

    // Convert vertical wheel events to horizontal scrolling.
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (scrollContainer.value) {
        const scrollStep = 2
        const newScrollLeft = scrollContainer.value.scrollLeft + e.deltaY * scrollStep
        scrollContainer.value.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
      }
    }

    // Variables to store drag state.
    let isDragging = false
    let startX = 0
    let startScrollLeft = 0

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      startX = e.pageX
      if (scrollContainer.value) {
        startScrollLeft = scrollContainer.value.scrollLeft
        scrollContainer.value.classList.add('dragging')
      }
    }

    const onMouseUp = () => {
      isDragging = false
      if (scrollContainer.value) {
        scrollContainer.value.classList.remove('dragging')
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !scrollContainer.value) return
      e.preventDefault()
      const dx = e.pageX - startX
      scrollContainer.value.scrollLeft = startScrollLeft - dx
    }

    onMounted(async () => {
      items.value = await getItems()
      if (scrollContainer.value) {
        scrollContainer.value.addEventListener('wheel', handleWheel, { passive: false })
      }
      // Attach drag events globally so dragging works no matter where you click.
      document.addEventListener('mousedown', onMouseDown)
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)

      // Set up an IntersectionObserver to toggle animation as items enter/leave view.
      // Set up an IntersectionObserver to toggle animation as items enter/leave view.
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // Only toggle animation for items on the right side.
            if (entry.boundingClientRect.left >= 0) {
              if (entry.isIntersecting) {
                entry.target.classList.add('animate')
              } else {
                entry.target.classList.remove('animate')
              }
            }
          })
        },
        {
          threshold: 0.5,
          // Shift the right boundary 100px inward so items disappear earlier when scrolling back.
          rootMargin: '0px -100px 0px 0px',
        },
      )

      // Observe all items.
      setTimeout(() => {
        const itemElements = document.querySelectorAll('.item')
        itemElements.forEach((el) => {
          observer.observe(el)
        })
      }, 100)
    })

    onUnmounted(() => {
      if (scrollContainer.value) {
        scrollContainer.value.removeEventListener('wheel', handleWheel)
      }
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    })

    return { items, scrollContainer }
  },
})
</script>

<style scoped>
/* Full viewport scroll container with cursor effect */
.scroll-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end; /* Align content to the bottom */
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* For Firefox */
  background-color: var(--color-background-soft);
  scroll-behavior: smooth;
  background-image: url('@/assets/bg.jpg');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  scroll-behavior: smooth;
}

.scroll-container::-webkit-scrollbar {
  display: none; /* Hide scrollbars for Webkit browsers */
}

/* Dragging state */
.scroll-container.dragging {
  cursor: move;
  user-select: none;
  scroll-behavior: auto;
}

/* Container for bottom content */
.bottom-content {
  width: 100%;
}

/* Items Row */
.items-row {
  display: flex;
  flex-direction: row;
}

/* Items initial state: hidden, offset, scaled down with transition */
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
  opacity: 0;
  /* Start offscreen above with a smaller scale */
  transform: translateY(-300px) scale(0.5);
  transition:
    opacity 0.7s ease-in,
    transform 0.7s ease-in;
}

.item.animate {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.item h3 {
  color: var(--color-heading);
  margin-bottom: 5px;
}

/* Timeline Row */
.timeline-row {
  width: max-content;
  /* existing styles */
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 50px;
  background-color: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
}

/* Timeline Items */
.timeline-item {
  width: 200px;
  padding: 0 10px;
  margin-right: 10px;
  text-align: center;
  line-height: 50px;
  flex-shrink: 0;
  color: var(--color-text);
}

/* Fixed arrow styled with theme color */
.fixed-arrow {
  position: fixed;
  bottom: 50px; /* Just above the timeline row */
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
