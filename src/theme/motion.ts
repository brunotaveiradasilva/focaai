// Shared motion presets. Everything eases out on a timing curve instead of springing, so
// nothing overshoots or bounces; distances and scales stay small. Builders are created per
// call because Reanimated's builders are mutable.
import { Easing, FadeIn, FadeInDown, FadeInRight, ReduceMotion, SlideInDown } from 'react-native-reanimated';

export const EASE_OUT = Easing.out(Easing.cubic);

const DURATION = 240;

// Content appearing in place (cards, sections).
export const enterFade = (delay = 0) =>
  FadeIn.duration(DURATION).delay(delay).easing(EASE_OUT).reduceMotion(ReduceMotion.System);

// Content rising slightly into place.
export const enterUp = (delay = 0) =>
  FadeInDown.duration(DURATION + 40).delay(delay).easing(EASE_OUT).reduceMotion(ReduceMotion.System);

// Next step of a flow (onboarding, simulado).
export const enterStep = () => FadeInRight.duration(DURATION).easing(EASE_OUT).reduceMotion(ReduceMotion.System);

export const enterSheet = () => SlideInDown.duration(280).easing(EASE_OUT).reduceMotion(ReduceMotion.System);

// Press feedback: quick ease to the pressed scale and back, no spring wobble.
export const PRESS_IN_MS = 90;
export const PRESS_OUT_MS = 160;
// Shrinks every requested press scale toward 1, so 0.85 becomes a gentler 0.94.
export const softenScale = (scaleTo: number) => 1 - (1 - scaleTo) * 0.4;
