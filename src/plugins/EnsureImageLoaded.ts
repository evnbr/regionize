import type { Plugin } from '../types';

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const isImage = (node: Element): node is HTMLImageElement => {
  return node.tagName === 'IMG';
};

const isUnloadedImage = (node: Element): node is HTMLImageElement => {
  return isImage(node) && !node.naturalWidth;
};

// Polls every 10ms for image.naturalWidth
// or an error event. Doesn't use promise.reject, since missing images
// shouldn't prevent layout from continuing
const pollForImageSize = async (image: HTMLImageElement): Promise<number> => {
  const imgLoadStartTime = performance.now();
  let failed = false;
  image.addEventListener('error', () => {
    failed = true;
  });

  // Restart image load, to guarantee event listender fires.
  const originalSrc = image.src;
  image.src = originalSrc;

  while (!image.naturalWidth && !failed) {
    await sleep(10);
  }

  return performance.now() - imgLoadStartTime;
};

export const ensureImageLoaded = (): Plugin => ({
  selector: 'img',
  onAddStart: async (el) => {
    if (isUnloadedImage(el)) {
      await pollForImageSize(el);
    }
  },
});
