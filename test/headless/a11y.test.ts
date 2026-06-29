import { describe, it, expect } from 'vitest';
import { formatA11yMessage, notificationMessage } from '../../src/headless/a11y';

describe('formatA11yMessage', () => {
  it('substitutes both tokens', () => {
    expect(formatA11yMessage('{{index}} / {{slidesLength}}', { index: 2, slidesLength: 5 })).toBe(
      '2 / 5',
    );
  });
  it('substitutes index alone', () => {
    expect(formatA11yMessage('Go to slide {{index}}', { index: 3, slidesLength: 9 })).toBe(
      'Go to slide 3',
    );
  });
  it('leaves a template with no tokens untouched', () => {
    expect(formatA11yMessage('Previous slide', { index: 1, slidesLength: 5 })).toBe(
      'Previous slide',
    );
  });
});

describe('notificationMessage', () => {
  const msgs = {
    prevSlideMessage: 'Previous slide',
    nextSlideMessage: 'Next slide',
    firstSlideMessage: 'This is the first slide',
    lastSlideMessage: 'This is the last slide',
  };
  it('announces next in the middle', () => {
    expect(notificationMessage('next', { isBeginning: false, isEnd: false }, msgs)).toBe(
      'Next slide',
    );
  });
  it('announces last at the end', () => {
    expect(notificationMessage('next', { isBeginning: false, isEnd: true }, msgs)).toBe(
      'This is the last slide',
    );
  });
  it('announces prev in the middle', () => {
    expect(notificationMessage('prev', { isBeginning: false, isEnd: false }, msgs)).toBe(
      'Previous slide',
    );
  });
  it('announces first at the beginning', () => {
    expect(notificationMessage('prev', { isBeginning: true, isEnd: false }, msgs)).toBe(
      'This is the first slide',
    );
  });
});
