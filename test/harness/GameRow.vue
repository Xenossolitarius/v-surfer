<template>
  <Surfer
    class="game-row"
    slides-per-view="auto"
    :slides-per-group-auto="true"
    :css-mode="cssMode"
    :modules="[]"
  >
    <template #container-start>
      <h2 class="game-row__title">{{ title }}</h2>
    </template>

    <template v-if="loading">
      <Item v-for="i in skeletonCount" :key="`skeleton-${i}`">
        <div class="game-tile game-tile--skeleton" />
      </Item>
    </template>
    <template v-else>
      <Item v-for="game in games" :key="game.gameCode">
        <img class="game-tile" :src="game.image" :alt="game.name" />
      </Item>
    </template>

    <template #container-end>
      <slot name="footer" />
    </template>
  </Surfer>
</template>

<script setup lang="ts">
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import type { FakeGame } from './fixtures';

withDefaults(
  defineProps<{
    games: FakeGame[];
    title?: string;
    loading?: boolean;
    cssMode?: boolean;
    skeletonCount?: number;
  }>(),
  { title: 'Top games', loading: false, cssMode: false, skeletonCount: 6 },
);
</script>
