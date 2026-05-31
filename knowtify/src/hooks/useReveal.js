import { useEffect, useRef } from "react";

/**
 * Attaches an IntersectionObserver to a ref and adds the "visible" class
 * when the element enters the viewport.
 *
 * @param {number} delay - optional extra CSS transition-delay in seconds
 * @returns React ref to attach to your element
 */
export function useReveal(delay = 0) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (delay) {
      el.style.transitionDelay = `${delay}s`;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return ref;
}
