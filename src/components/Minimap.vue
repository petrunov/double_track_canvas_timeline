<template>
  <div class="minimap-container" @click="handleMinimapClick">
    <div class="minimap" :style="{ width: minimapWidth + 'px' }">
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
        @mousedown="handleIndicatorMouseDown"
        @click.stop
        ref="indicatorRef"
      >
        <div class="crosshair-lines"></div>
        <div class="corner top-left"></div>
        <div class="corner top-right"></div>
        <div class="corner bottom-left"></div>
        <div class="corner bottom-right"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, type Ref } from 'vue'

interface TimelineTick {
  left: number
  type: 'major' | 'medium' | 'minor'
  year?: number
}

interface MinimapRectangle {
  left: number
  top: number
  width: number
  height: number
  title: string
  color: string
  category: string
}

interface CategoryFilter {
  [key: string]: boolean
}

export default defineComponent({
  name: 'Minimap',
  props: {
    minimapWidth: {
      type: Number,
      required: true,
    },
    timelineTicks: {
      type: Array as () => TimelineTick[],
      required: true,
    },
    minimapRectangles: {
      type: Array as () => MinimapRectangle[],
      required: true,
    },
    minimapIndicatorStyle: {
      type: Object as () => Record<string, string | number>,
      required: true,
    },
    isIndicatorDragging: {
      type: Boolean,
      required: true,
    },
    categoryFilter: {
      type: Object as () => CategoryFilter,
      required: true,
    },
  },
  emits: ['minimapClick', 'minimapIndicatorMouseDown', 'minimapIndicatorTouchStart'],
  setup(props, { emit }) {
    const indicatorRef: Ref<HTMLElement | null> = ref(null)

    const handleMinimapClick = (e: MouseEvent) => {
      emit('minimapClick', e)
    }

    const handleIndicatorMouseDown = (e: MouseEvent) => {
      emit('minimapIndicatorMouseDown', e)
    }

    const handleTouchStart = (e: TouchEvent) => {
      emit('minimapIndicatorTouchStart', e)
    }

    onMounted(() => {
      if (indicatorRef.value) {
        indicatorRef.value.addEventListener('touchstart', handleTouchStart, { passive: false })
      }
    })

    onUnmounted(() => {
      if (indicatorRef.value) {
        indicatorRef.value.removeEventListener('touchstart', handleTouchStart)
      }
    })

    return {
      handleMinimapClick,
      handleIndicatorMouseDown,
      indicatorRef,
    }
  },
})
</script>

<style scoped>
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
</style>
