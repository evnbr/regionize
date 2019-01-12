import Region from './Region';

export type ElementCloner = (el: HTMLElement) => HTMLElement;

export type ElementChecker = (el: HTMLElement) => boolean;

export type RegionMaker = () => Region;

export type LayoutResult = {
    completed: boolean,
    remainder?: Text,
    waitTime?: number,
}

export type RuleApplier = (
    original: HTMLElement,
    clone: HTMLElement,
    nextChild?: HTMLElement,
    cloner?: ElementCloner
) => void;
  