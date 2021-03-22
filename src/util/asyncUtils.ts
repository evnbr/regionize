const MAX_WORK_MS = 30;

const nextFrame = (): Promise<number> => {
  return new Promise((resolve) => {
    requestAnimationFrame((t) => resolve(t));
  });
};

let lastYieldTime = 0;

export const shouldYield = (): boolean => {
  const timeSinceYield = performance.now() - lastYieldTime;
  return timeSinceYield > MAX_WORK_MS;
};

export const yieldIfNeeded = async (): Promise<void> => {
  if (shouldYield()) lastYieldTime = await nextFrame();
};

export const runInSequence = async <T>(
  asyncFns: Array<(arg: T) => Promise<any>>,
  arg: T,
) => {
  for (const f of asyncFns) await f(arg);
};
