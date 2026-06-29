/** Pure message helpers ported from `src/modules/a11y/a11y.ts`. DOM-free. */

export interface A11yMessageVars {
  /** 1-based slide index. */
  index: number;
  slidesLength: number;
}

/**
 * Substitute `{{index}}` and `{{slidesLength}}` in a message template. Uses
 * non-global `.replace` (first occurrence only), matching a11y.ts.
 */
export function formatA11yMessage(template: string, vars: A11yMessageVars): string {
  return template
    .replace(/\{\{index\}\}/, String(vars.index))
    .replace(/\{\{slidesLength\}\}/, String(vars.slidesLength));
}

export interface A11yEdges {
  isBeginning: boolean;
  isEnd: boolean;
}

export interface A11yNavMessages {
  prevSlideMessage: string;
  nextSlideMessage: string;
  firstSlideMessage: string;
  lastSlideMessage: string;
}

/**
 * Which message to announce after a prev/next activation (port of onEnterOrSpaceKey):
 * next → isEnd ? last : next; prev → isBeginning ? first : prev. Edges are read
 * AFTER the navigation, exactly as frozen reads `surfer.isEnd`/`isBeginning` post-slide.
 */
export function notificationMessage(
  direction: 'prev' | 'next',
  edges: A11yEdges,
  messages: A11yNavMessages,
): string {
  if (direction === 'next') {
    return edges.isEnd ? messages.lastSlideMessage : messages.nextSlideMessage;
  }
  return edges.isBeginning ? messages.firstSlideMessage : messages.prevSlideMessage;
}
