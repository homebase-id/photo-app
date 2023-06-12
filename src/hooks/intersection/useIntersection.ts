import React, { useEffect } from 'react';

const listenerCallbacks = new WeakMap();
const cleanupSettings = new WeakMap();

let observer: IntersectionObserver;

const handleIntersections: IntersectionObserverCallback = (entries) => {
  entries.forEach((entry) => {
    if (listenerCallbacks.has(entry.target)) {
      const callback = listenerCallbacks.get(entry.target);
      const cleanup = cleanupSettings.get(entry.target);

      if (entry.isIntersecting || entry.intersectionRatio > 0) {
        if (cleanup) {
          observer.unobserve(entry.target);
          listenerCallbacks.delete(entry.target);
        }
        callback();
      }
    }
  });
};

const getIntersectionObserver = (fastThreshold: boolean) => {
  if (observer === undefined) {
    observer = new IntersectionObserver(handleIntersections, {
      rootMargin: fastThreshold ? '100%' : '100px',
      threshold: fastThreshold ? 0.001 : 0.15,
    });
  }
  return observer;
};

export const useIntersection = (
  elem: React.RefObject<HTMLElement> | undefined,
  callback: () => void,
  options: { keepObserving: boolean; fastThreshold: boolean } = {
    keepObserving: false,
    fastThreshold: false,
  }
) => {
  useEffect(() => {
    const target = elem?.current;
    const observer = getIntersectionObserver(options.fastThreshold);

    if (!target) {
      return;
    }

    listenerCallbacks.set(target, callback);
    cleanupSettings.set(target, !options.keepObserving);
    observer.observe(target);

    return () => {
      listenerCallbacks.delete(target);
      observer.unobserve(target);
    };
  }, [elem]);
};
