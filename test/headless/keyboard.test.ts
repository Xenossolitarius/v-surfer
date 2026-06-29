import { describe, it, expect } from 'vitest';
import { keyboardAction, type KeyboardModifiers } from '../../src/headless/keyboard';

const NO_MODS: KeyboardModifiers = {
  shiftKey: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
};
const H = { direction: 'horizontal' as const, rtl: false, pageUpDown: true };
const V = { direction: 'vertical' as const, rtl: false, pageUpDown: true };

// Key codes: PageUp 33, PageDown 34, ArrowLeft 37, ArrowUp 38, ArrowRight 39, ArrowDown 40.
describe('keyboardAction', () => {
  it('horizontal: ArrowRight → next, ArrowLeft → prev (LTR)', () => {
    expect(keyboardAction(39, NO_MODS, H)).toEqual({ action: 'next', preventDefault: true });
    expect(keyboardAction(37, NO_MODS, H)).toEqual({ action: 'prev', preventDefault: true });
  });
  it('horizontal RTL: ArrowRight → prev, ArrowLeft → next', () => {
    const Hrtl = { ...H, rtl: true };
    expect(keyboardAction(39, NO_MODS, Hrtl)).toEqual({ action: 'prev', preventDefault: true });
    expect(keyboardAction(37, NO_MODS, Hrtl)).toEqual({ action: 'next', preventDefault: true });
  });
  it('horizontal: PageDown → next, PageUp → prev', () => {
    expect(keyboardAction(34, NO_MODS, H).action).toBe('next');
    expect(keyboardAction(33, NO_MODS, H).action).toBe('prev');
  });
  it('horizontal: ArrowUp/ArrowDown are not navigation', () => {
    expect(keyboardAction(38, NO_MODS, H)).toEqual({ action: 'none', preventDefault: false });
    expect(keyboardAction(40, NO_MODS, H)).toEqual({ action: 'none', preventDefault: false });
  });
  it('vertical: ArrowDown → next, ArrowUp → prev (rtl ignored)', () => {
    expect(keyboardAction(40, NO_MODS, V)).toEqual({ action: 'next', preventDefault: true });
    expect(keyboardAction(38, NO_MODS, V)).toEqual({ action: 'prev', preventDefault: true });
    expect(keyboardAction(40, NO_MODS, { ...V, rtl: true }).action).toBe('next');
  });
  it('vertical: ArrowLeft/ArrowRight are not navigation', () => {
    expect(keyboardAction(37, NO_MODS, V)).toEqual({ action: 'none', preventDefault: false });
    expect(keyboardAction(39, NO_MODS, V)).toEqual({ action: 'none', preventDefault: false });
  });
  it('any modifier → none', () => {
    expect(keyboardAction(39, { ...NO_MODS, shiftKey: true }, H)).toEqual({
      action: 'none',
      preventDefault: false,
    });
    expect(keyboardAction(39, { ...NO_MODS, ctrlKey: true }, H).action).toBe('none');
    expect(keyboardAction(40, { ...NO_MODS, metaKey: true }, V).action).toBe('none');
  });
  it('pageUpDown:false disables the Page keys', () => {
    const Hno = { ...H, pageUpDown: false };
    expect(keyboardAction(34, NO_MODS, Hno)).toEqual({ action: 'none', preventDefault: false });
    expect(keyboardAction(33, NO_MODS, Hno).action).toBe('none');
  });
  it('a non-navigation key → none', () => {
    expect(keyboardAction(65, NO_MODS, H)).toEqual({ action: 'none', preventDefault: false });
  });
});
