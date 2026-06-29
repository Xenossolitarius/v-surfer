import { Fragment, type VNode } from 'vue';
import { SURFER_ITEM_NAME } from './item';

export interface ItemFlags {
  index: number;
  realIndex: number;
  isActive: boolean;
  isPrev: boolean;
  isNext: boolean;
  isVisible: boolean;
  isFullyVisible: boolean;
  /** The <Item :data> value, passed through to the slot (headless { slide } parity). */
  data: unknown;
}

export interface HarvestedItem {
  data: unknown;
  render?: (flags: ItemFlags) => unknown;
}

export interface HarvestResult {
  items: HarvestedItem[];
  chrome: VNode[];
}

/** Harvest <Item> vnodes (name 'SurferItem') and chrome vnodes from a slot's
 * vnode list, recursing into fragments (v-for renders a Fragment). Returns both
 * items and non-Item vnodes (chrome) from a single walk. Port of the
 * slide-harvest in src/vue/get-children.ts, specialized to <Item>. */
export function getItems(vnodes: VNode[]): HarvestResult {
  const items: HarvestedItem[] = [];
  const chrome: VNode[] = [];
  const walk = (nodes: VNode[]): void => {
    for (const vnode of nodes) {
      if (vnode.type === Fragment && Array.isArray(vnode.children)) {
        walk(vnode.children as VNode[]);
        continue;
      }
      const t = vnode.type as { name?: string } | undefined;
      if (t && t.name === SURFER_ITEM_NAME) {
        const props = (vnode.props ?? {}) as { data?: unknown };
        const slots = vnode.children as { default?: (flags: ItemFlags) => unknown } | null;
        items.push({ data: props.data, render: slots?.default });
      } else {
        chrome.push(vnode);
      }
    }
  };
  walk(vnodes);
  return { items, chrome };
}
