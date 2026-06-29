import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import Navigation, { NavigationModule } from '../../src/vue/modules/navigation';
import { useSurferHost } from '../../src/vue/module-host';

function mountNav(hostExtra: Record<string, unknown> = {}) {
  const host = useSurferHost({
    slidesPerView: 1,
    spaceBetween: 0,
    modules: [NavigationModule],
    ...hostExtra,
  });
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: { host },
    slots: {
      default: () => [
        ...Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })),
        h(Navigation),
      ],
    },
  });
  return { host, wrapper };
}

describe('navigation next/prev events', () => {
  it('emits navigationNext on next click — on the host bus and on <SurferNavigation>', async () => {
    const { host, wrapper } = mountNav();
    await flushPromises();
    const seen: string[] = [];
    host.on('navigationNext', () => seen.push('navigationNext'));
    await wrapper.find('.v-surfer-button-next').trigger('click');
    expect(seen).toEqual(['navigationNext']);
    expect(wrapper.findComponent(Navigation).emitted('navigationNext')).toBeTruthy();
    wrapper.unmount();
    host.dispose();
  });

  it('does NOT surface navigationNext on <KitSurfer> (component separation)', async () => {
    const { host, wrapper } = mountNav();
    await flushPromises();
    await wrapper.find('.v-surfer-button-next').trigger('click');
    expect(wrapper.emitted('navigationNext')).toBeFalsy();
    wrapper.unmount();
    host.dispose();
  });

  it('suppresses navigationPrev at the beginning (frozen edge guard)', async () => {
    const { host, wrapper } = mountNav();
    await flushPromises();
    const seen: string[] = [];
    host.on('navigationPrev', () => seen.push('navigationPrev'));
    await wrapper.find('.v-surfer-button-prev').trigger('click'); // at index 0 → prevDisabled
    expect(seen).toEqual([]);
    wrapper.unmount();
    host.dispose();
  });
});

describe('navigation hideOnClick + show/hide', () => {
  it('toggles hiddenClass on the buttons and emits hide then show', async () => {
    const { host, wrapper } = mountNav({ config: { navigation: { hideOnClick: true } } });
    await flushPromises();
    const hidden: string[] = [];
    host.on('navigationHide', () => hidden.push('hide'));
    host.on('navigationShow', () => hidden.push('show'));
    const next = wrapper.find('.v-surfer-button-next').element as HTMLElement;
    const slide = wrapper.findAll('.v-surfer-slide')[0].element;

    // First non-button click → hide.
    slide.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(next.classList.contains('v-surfer-button-hidden')).toBe(true);

    // Second non-button click → show.
    slide.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(next.classList.contains('v-surfer-button-hidden')).toBe(false);

    expect(hidden).toEqual(['hide', 'show']);
    wrapper.unmount();
    host.dispose();
  });

  it('does not toggle when the click target is a nav button', async () => {
    const { host, wrapper } = mountNav({ config: { navigation: { hideOnClick: true } } });
    await flushPromises();
    const fired: string[] = [];
    host.on('navigationHide', () => fired.push('hide'));
    host.on('navigationShow', () => fired.push('show'));
    // Clicking the prev button (a nav button) must not trigger hideOnClick.
    await wrapper.find('.v-surfer-button-prev').trigger('click');
    expect(fired).toEqual([]);
    expect(
      (wrapper.find('.v-surfer-button-next').element as HTMLElement).classList.contains(
        'v-surfer-button-hidden',
      ),
    ).toBe(false);
    wrapper.unmount();
    host.dispose();
  });

  it('does nothing when hideOnClick is off (default)', async () => {
    const { host, wrapper } = mountNav();
    await flushPromises();
    const fired: string[] = [];
    host.on('navigationHide', () => fired.push('hide'));
    wrapper
      .findAll('.v-surfer-slide')[0]
      .element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(fired).toEqual([]);
    wrapper.unmount();
    host.dispose();
  });
});
