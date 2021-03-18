import type { Plugin } from '../types';

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  image.src = image.src; // re-trigger error if already failed

  while (!image.naturalWidth && !failed) {
    await sleep(10);
  }

  return performance.now() - imgLoadStartTime;
};


export const ensureImageLoaded = (): Plugin => ({
  selector: 'img',
  canSkipTraverse: (el) => {
    // Any parent containing an unloaded image could change
    // size, and must be traversed to trigger onAddStart.
    const img = el.querySelector('img');
    return !img || !isUnloadedImage(img);
  },
  onAddStart: async (el) => {
    if (isUnloadedImage(el)) {
      // This will be called on every element. Only begin polling when 
      // we're currenly adding an unloaded image
      await pollForImageSize(el);
    }
  }
});