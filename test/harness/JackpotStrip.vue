<template>
  <Surfer
    class="jackpot-strip"
    slides-per-view="auto"
    :free-mode="true"
    :modules="modules"
  >
    <Item v-for="game in games" :key="game.gameCode">
      <img class="jackpot-tile" :src="game.image" :alt="game.name" />
    </Item>
    <SurferNavigation />
    <SurferMousewheel />
  </Surfer>
</template>

<script setup lang="ts">
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import SurferNavigation, { NavigationModule } from '../../src/vue/modules/navigation';
import SurferMousewheel, { MousewheelModule } from '../../src/vue/modules/mousewheel';
import type { FakeGame } from './fixtures';

defineProps<{ games: FakeGame[] }>();
const modules = [NavigationModule, MousewheelModule];
</script>
