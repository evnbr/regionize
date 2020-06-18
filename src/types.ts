import Region from './Region';

export type ElementChecker = (el: HTMLElement) => boolean;
export type ElementCloner = (el: HTMLElement) => HTMLElement;
export type ElementGetter = () => HTMLElement;

export type RegionGetter = () => Region;

export enum AddedStatus {
  ALL = 'all',
  PARTIAL = 'partial',
  NONE = 'none',
}

export type AddAttemptResult<T> = {
  status: AddedStatus;
  remainder?: T;
};

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

export interface FlowProgressEvent {
  state: 'inProgress' | 'imageLoading' | 'done';
  estimatedProgress: number;
  imageName?: string;
  imageWaitTime?: number;
}

export interface FlowOptions {
  content: HTMLElement;
  createRegion: RegionGetter;
  applySplit?: SplitRuleApplier;
  canSplit?: ElementChecker;
  shouldTraverse?: ElementChecker;
  beforeAdd?: AsyncRuleApplier;
  afterAdd?: AsyncRuleApplier;
  onProgress?: (e: FlowProgressEvent) => void;
}

export interface FlowCallbacks {
  createRegion: RegionGetter;
  applySplit: SplitRuleApplier;
  canSplit: ElementChecker;
  shouldTraverse: ElementChecker;
  beforeAdd: AsyncRuleApplier;
  afterAdd: AsyncRuleApplier;
  onProgress: (e: FlowProgressEvent) => void;
}
