import Region from './Region';

export type ElementChecker = (el: HTMLElement) => boolean;
export type ElementCloner = (el: HTMLElement) => HTMLElement;
export type ElementGetter = () => HTMLElement;

export type RegionGetter = () => Region;

export type AsyncRuleApplier = (
  el: HTMLElement,
  next: RegionGetter,
) => Promise<any> | undefined;

export type SplitRuleApplier = (
  original: HTMLElement,
  clone: HTMLElement,
  nextChild?: HTMLElement,
  cloner?: ElementCloner,
) => void;
