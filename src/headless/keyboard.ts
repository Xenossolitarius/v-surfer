/** Port of the key→action decision in `src/modules/keyboard/keyboard.ts` (DOM gates live in the component). */
export interface KeyboardModifiers {
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

export interface KeyboardParams {
  direction: 'horizontal' | 'vertical';
  rtl: boolean;
  pageUpDown: boolean;
}

export interface KeyboardAction {
  action: 'next' | 'prev' | 'none';
  preventDefault: boolean;
}

const NONE: KeyboardAction = { action: 'none', preventDefault: false };

export function keyboardAction(
  keyCode: number,
  mods: KeyboardModifiers,
  params: KeyboardParams,
): KeyboardAction {
  if (mods.shiftKey || mods.altKey || mods.ctrlKey || mods.metaKey) return NONE;

  const isPageUp = params.pageUpDown && keyCode === 33;
  const isPageDown = params.pageUpDown && keyCode === 34;
  const isArrowLeft = keyCode === 37;
  const isArrowRight = keyCode === 39;
  const isArrowUp = keyCode === 38;
  const isArrowDown = keyCode === 40;

  if (params.direction === 'horizontal') {
    if (!(isPageUp || isPageDown || isArrowLeft || isArrowRight)) return NONE;
    const rtl = params.rtl;
    if (((isPageDown || isArrowRight) && !rtl) || ((isPageUp || isArrowLeft) && rtl)) {
      return { action: 'next', preventDefault: true };
    }
    return { action: 'prev', preventDefault: true };
  }
  // vertical
  if (!(isPageUp || isPageDown || isArrowUp || isArrowDown)) return NONE;
  if (isPageDown || isArrowDown) return { action: 'next', preventDefault: true };
  return { action: 'prev', preventDefault: true };
}
