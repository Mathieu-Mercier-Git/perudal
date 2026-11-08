import {
  MutableRefObject, RefObject, useEffect, useRef,
} from 'react';

// Distance (en px) de molette/trackpad ou de glissé tactile nécessaire pour avancer d'un cran
const WHEEL_STEP_PX: number = 150;
const TOUCH_STEP_PX: number = 70;
// Délai minimal entre deux crans à la molette/trackpad (évite l'emballement dû à l'inertie du trackpad)
const WHEEL_COOLDOWN_MS: number = 250;

/**
 * Fait défiler une valeur par crans quand on scrolle (molette, trackpad) ou qu'on glisse
 * verticalement (tactile) sur l'élément : vers le haut = +1, vers le bas = -1.
 * Le défilement de la page est bloqué tant que le geste a lieu sur l'élément.
 * Les écouteurs sont natifs (non passifs) car React enregistre `onWheel` en passif,
 * ce qui empêche d'appeler `preventDefault`.
 */
export default function useScrollStepper(
  ref: RefObject<HTMLElement>,
  onStep: (delta: number) => void,
  isDisabled: boolean = false,
) {
  // Toujours appeler la dernière version du callback sans réabonner les écouteurs
  const onStepRef: MutableRefObject<(delta: number) => void> = useRef(onStep);
  onStepRef.current = onStep;
  const isDisabledRef: MutableRefObject<boolean> = useRef(isDisabled);
  isDisabledRef.current = isDisabled;

  useEffect(() => {
    const element: HTMLElement | null = ref.current;
    if (!element) {
      return undefined;
    }

    let wheelAccumulator: number = 0;
    let lastWheelStepAt: number = 0;
    let touchLastY: number | undefined;
    let touchAccumulator: number = 0;

    const emitSteps = (accumulated: number, stepSize: number): number => {
      let remaining: number = accumulated;
      while (Math.abs(remaining) >= stepSize) {
        const direction: number = remaining > 0 ? 1 : -1;
        onStepRef.current(direction);
        remaining -= direction * stepSize;
      }
      return remaining;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (isDisabledRef.current) {
        return;
      }
      // Scroll vers le haut (deltaY < 0) = augmenter.
      // deltaMode 1 (lignes) / 2 (pages) : chaque évènement vaut un cran
      const pixels: number = event.deltaMode === 0 ? -event.deltaY : -Math.sign(event.deltaY) * WHEEL_STEP_PX;
      // Changement de sens : on repart de zéro pour rester réactif
      if (wheelAccumulator !== 0 && Math.sign(pixels) !== Math.sign(wheelAccumulator)) {
        wheelAccumulator = 0;
      }
      wheelAccumulator += pixels;
      const now: number = Date.now();
      if (Math.abs(wheelAccumulator) < WHEEL_STEP_PX || now - lastWheelStepAt < WHEEL_COOLDOWN_MS) {
        return;
      }
      // Un seul cran par geste, le reste du défilement est ignoré
      onStepRef.current(Math.sign(wheelAccumulator));
      wheelAccumulator = 0;
      lastWheelStepAt = now;
    };

    const onTouchStart = (event: TouchEvent) => {
      touchLastY = event.touches.length === 1 ? event.touches[0].clientY : undefined;
      touchAccumulator = 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (touchLastY === undefined || event.touches.length !== 1) {
        return;
      }
      event.preventDefault();
      const currentY: number = event.touches[0].clientY;
      // Glisser vers le haut (y diminue) = augmenter
      touchAccumulator += touchLastY - currentY;
      touchLastY = currentY;
      if (!isDisabledRef.current) {
        touchAccumulator = emitSteps(touchAccumulator, TOUCH_STEP_PX);
      }
    };

    const onTouchEnd = () => {
      touchLastY = undefined;
      touchAccumulator = 0;
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd);
    element.addEventListener('touchcancel', onTouchEnd);
    return () => {
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [ref]);
}
