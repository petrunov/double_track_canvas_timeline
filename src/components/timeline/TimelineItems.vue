<template>
  <div class="items-row">
    <RecycleScroller
      class="scroller"
      :items="items"
      :item-size="210"
      direction="horizontal"
      key-field="id"
      v-slot="{ item }"
    >
      <div class="item" :class="{ 'hidden-item': !categoryFilter[item.category] }">
        <h3>{{ item.english_heading }}</h3>
        <p>{{ item.english_long_text }}</p>
      </div>
    </RecycleScroller>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { Item } from '@/services/dataService'

export default defineComponent({
  name: 'TimelineItems',
  props: {
    items: {
      type: Array as () => Item[],
      required: true,
    },
    categoryFilter: {
      type: Object as () => Record<string, boolean>,
      required: true,
    },
  },
})
</script>

<style scoped>
.scroller {
  height: 300px; /* Adjusted to match the item height */
  width: 100%;
}

.items-row {
  display: flex;
  flex-direction: row;
}

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

.item h3 {
  color: var(--color-heading);
  margin-bottom: 5px;
}

.hidden-item {
  visibility: hidden;
}
</style>
