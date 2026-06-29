import { describe, it, expect } from 'vitest';
import { AutoplayController, type AutoplayControllerParams } from '../../src/headless/autoplay';

const params = (over: Partial<AutoplayControllerParams> = {}): AutoplayControllerParams => ({
  delay: 1000,
  reverseDirection: false,
  stopOnLastSlide: false,
  loop: false,
  rewind: false,
  disableOnInteraction: false,
  ...over,
});
const mid = { isBeginning: false, isEnd: false, slidesLength: 5 };

describe('AutoplayController', () => {
  it('start arms a full delay and reports timeLeft counting down', () => {
    const c = new AutoplayController(params());
    expect(c.start(1000)).toBe(1000);
    expect(c.running).toBe(true);
    expect(c.timeLeft(1000)).toBe(1000);
    expect(c.timeLeft(1400)).toBe(600);
  });
  it('fire returns the advance decision; armNext re-arms a full leg', () => {
    const c = new AutoplayController(params());
    c.start(1000);
    expect(c.fire(mid)).toEqual({ kind: 'next' });
    expect(c.armNext(2000)).toBe(1000);
    expect(c.timeLeft(2400)).toBe(600);
  });
  it('non-reset pause keeps the remaining time; resume continues with it', () => {
    const c = new AutoplayController(params());
    c.start(1000);
    c.pause(1400); // 600 remaining
    expect(c.paused).toBe(true);
    expect(c.timeLeft(99999)).toBe(600); // frozen at the remaining value while paused
    expect(c.resume(5000)).toBe(600);
    expect(c.paused).toBe(false);
    expect(c.timeLeft(5000)).toBe(600);
    expect(c.timeLeft(5100)).toBe(500);
  });
  it('re-pausing while already paused preserves the remaining time', () => {
    const c = new AutoplayController(params());
    c.start(1000);
    c.pause(1400); // 600 remaining, frozen
    // A second interaction (e.g. a tap while hovering) at a later wall-clock time must
    // NOT recompute from the stale startTime and shrink the stored remaining.
    c.pause(1800);
    expect(c.timeLeft(99999)).toBe(600);
    c.pause(1950);
    expect(c.timeLeft(99999)).toBe(600);
    expect(c.resume(5000)).toBe(600);
  });
  it('reset pause restores the full delay on resume', () => {
    const c = new AutoplayController(params());
    c.start(1000);
    c.pause(1400, { reset: true });
    expect(c.timeLeft(1400)).toBe(1000);
    expect(c.resume(5000)).toBe(1000);
  });
  it('interaction with disableOnInteraction stops', () => {
    const c = new AutoplayController(params({ disableOnInteraction: true }));
    c.start(1000);
    expect(c.interaction(1400)).toBe('stop');
    expect(c.running).toBe(false);
  });
  it('interaction without disableOnInteraction pauses (reset honored)', () => {
    const c = new AutoplayController(params());
    c.start(1000);
    expect(c.interaction(1400, { reset: true })).toBe('pause');
    expect(c.paused).toBe(true);
    expect(c.timeLeft(1400)).toBe(1000); // reset → full delay
  });
  it('stop makes timeLeft 0 and resume a no-op', () => {
    const c = new AutoplayController(params());
    c.start(1000);
    c.stop();
    expect(c.timeLeft(2000)).toBe(0);
    expect(c.resume(2000)).toBeNull();
  });
});
