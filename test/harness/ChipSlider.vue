<template>
  <Surfer
    class="chip-slider"
    :class="{ start: isBeginning, end: isEnd }"
    slides-per-view="auto"
    :css-mode="cssMode"
    :free-mode="true"
    :modules="modules"
    :on-ready="onSurfer"
    @slide-change="update"
    @reach-beginning="update"
    @reach-end="update"
  >
    <Item v-for="chip in chips" :key="chip">
      <span class="chip">{{ chip }}</span>
    </Item>
  </Surfer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import type { ModuleHost } from '../../src/vue/module-host';

defineProps<{ chips: string[]; cssMode?: boolean }>();
const modules = [];
const isBeginning = ref(true);
const isEnd = ref(false);

let host: ModuleHost | undefined;

function update(): void {
  if (host) {
    isBeginning.value = host.state.value.isBeginning;
    isEnd.value = host.state.value.isEnd;
  }
}
function onSurfer(h: ModuleHost): void {
  host = h;
  update();
}

defineExpose({ getSurfer: () => host });
</script>
