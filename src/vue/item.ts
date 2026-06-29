import { defineComponent } from 'vue';

export const SURFER_ITEM_NAME = 'SurferItem';

/** Authoring marker. Its vnode is harvested by <Surfer> (data + default slot);
 * <Item> itself renders nothing — the Surfer renders the slot with engine flags. */
const Item = defineComponent({
  name: SURFER_ITEM_NAME,
  props: {
    data: { type: null, default: undefined },
  },
  setup() {
    return () => null;
  },
});

export default Item;
