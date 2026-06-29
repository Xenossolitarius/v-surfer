/** Find-or-create a shadow child div on a slide; className may be space-separated. */
export function ensureShadow(slideEl: HTMLElement, className: string): HTMLElement {
  const classes = className.split(' ').filter(Boolean);
  const selector = `.${classes.join('.')}`;
  let el = slideEl.querySelector<HTMLElement>(selector);
  if (!el) {
    el = document.createElement('div');
    el.classList.add(...classes);
    slideEl.append(el);
  }
  return el;
}

/** Remove all shadow children matching the selector. */
export function removeShadows(slideEl: HTMLElement, selector: string): void {
  slideEl.querySelectorAll(selector).forEach((el) => el.remove());
}
