<template>
  <Surfer
    class="hero"
    :loop="true"
    :slides-per-view="1.72"
    :breakpoints="breakpoints"
    :modules="modules"
  >
    <Item v-for="game in games" :key="game.gameCode">
      <img class="hero-tile" :src="game.image" :alt="game.name" />
    </Item>
    <SurferAutoplay v-if="autoplay" :delay="3000" :disable-on-interaction="false" />
  </Surfer>
</template>

<script setup lang="ts">
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import SurferAutoplay, { AutoplayModule } from '../../src/vue/modules/autoplay';
import type { FakeGame } from './fixtures';

// `autoplay` defaults on (mirrors the casino Showcase pattern); the snapshot test
// disables it so the captured DOM is a stable init frame, not a timer-advanced one.
withDefaults(defineProps<{ games: FakeGame[]; autoplay?: boolean }>(), { autoplay: true });
const modules = [AutoplayModule];
const breakpoints = {
  768: { slidesPerView: 2.2 },
  1024: { slidesPerView: 'auto' },
};
</script>
