import { useEffect, useState } from 'react';

export interface InputCapability {
  /** Primary pointer is coarse (finger/stylus) rather than a mouse. */
  coarsePointer: boolean;
  /** Device reports touch support. */
  touch: boolean;
  /** Viewport is narrow. */
  narrow: boolean;
  /**
   * True when the compact docked format bar should be used instead of the
   * selection bubble. A narrow desktop window is NOT a touch device, so
   * width alone never triggers it.
   */
  touchEditing: boolean;
}

const QUERIES = {
  coarse: '(pointer: coarse)',
  hover: '(hover: none)',
};

function read(narrowBreakpoint: number): InputCapability {
  if (typeof window === 'undefined') {
    return { coarsePointer: false, touch: false, narrow: false, touchEditing: false };
  }
  const coarsePointer =
    window.matchMedia(QUERIES.coarse).matches && window.matchMedia(QUERIES.hover).matches;
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const narrow = window.innerWidth < narrowBreakpoint;
  return {
    coarsePointer,
    touch,
    narrow,
    // Require an actual coarse/hoverless pointer. Width refines, never decides.
    touchEditing: coarsePointer && touch,
  };
}

/**
 * Capability-aware input detection for the editor. Distinguishes a narrow
 * desktop browser window from a real touch device.
 */
export function useInputCapability(narrowBreakpoint = 768): InputCapability {
  const [cap, setCap] = useState<InputCapability>(() => read(narrowBreakpoint));

  useEffect(() => {
    const mqCoarse = window.matchMedia(QUERIES.coarse);
    const mqHover = window.matchMedia(QUERIES.hover);
    const update = () => setCap(read(narrowBreakpoint));
    update();
    mqCoarse.addEventListener('change', update);
    mqHover.addEventListener('change', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      mqCoarse.removeEventListener('change', update);
      mqHover.removeEventListener('change', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [narrowBreakpoint]);

  return cap;
}
