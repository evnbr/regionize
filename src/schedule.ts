const maxWorkTimePerFrame = 30; // ms

const nextFrame = (): Promise<number> =>
  new Promise(resolve => {
    requestAnimationFrame(t => resolve(t));
  });

let lastYieldTime = 0;

export const shouldYield = (): boolean => {
  const timeSinceYield = performance.now() - lastYieldTime;
  return timeSinceYield > maxWorkTimePerFrame;
};

export const yieldIfNeeded = async (): Promise<void> => {
  if (shouldYield()) lastYieldTime = await nextFrame();
};