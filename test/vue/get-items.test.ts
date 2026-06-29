import { describe, it, expect } from 'vitest';
import { h, Fragment } from 'vue';
import Item from '../../src/vue/item';
import { getItems } from '../../src/vue/get-items';

describe('getItems', () => {
  it('harvests Item vnodes with their data and render fn', () => {
    const vnodes = [
      h(Item, { data: 'a' }, { default: () => h('div', 'A') }),
      h(Item, { data: 'b' }, { default: () => h('div', 'B') }),
    ];
    const items = getItems(vnodes).items;
    expect(items.map((i) => i.data)).toEqual(['a', 'b']);
    expect(typeof items[0].render).toBe('function');
  });

  it('recurses fragments (v-for produces a fragment)', () => {
    const vnodes = [
      h(Fragment, null, [
        h(Item, { data: 1 }, { default: () => h('div', '1') }),
        h(Item, { data: 2 }, { default: () => h('div', '2') }),
      ]),
    ];
    expect(getItems(vnodes).items.map((i) => i.data)).toEqual([1, 2]);
  });

  it('ignores non-Item vnodes and collects them as chrome', () => {
    const vnodes = [h('div', 'chrome'), h(Item, { data: 'x' })];
    expect(getItems(vnodes).items.map((i) => i.data)).toEqual(['x']);
    expect(getItems(vnodes).chrome.length).toBe(1);
  });
});
