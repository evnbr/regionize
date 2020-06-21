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

export type AddAttemptResult = {
  status: AddedStatus;
  remainder?: Node;
};

export type AsyncRuleApplier = (el: HTMLElement) => Promise<any> | undefined;

export type SplitRuleApplier = (
  original: HTMLElement,
  clone: HTMLElement,
  nextChild?: HTMLElement,
  cloner?: ElementCloner,
) => void;

export type RegionizeProgressEventName = 'inProgress' | 'imageLoading' | 'done';

export interface RegionizeProgressEvent {
  state: RegionizeProgressEventName;
  estimatedProgress: number;
  imageName?: string;
  imageWaitTime?: number;
}

export interface RegionizeOptions {
  createRegion: RegionGetter;
  onDidSplit?: SplitRuleApplier;
  canSplit?: ElementChecker;
  shouldTraverse?: ElementChecker;
  onWillAdd?: AsyncRuleApplier;
  onDidAdd?: AsyncRuleApplier;
  onProgress?: (e: RegionizeProgressEvent) => void;
}

export interface RegionizeDelegate {
  createRegion: RegionGetter;
  onDidSplit: SplitRuleApplier;
  canSplit: ElementChecker;
  shouldTraverse: ElementChecker;
  onWillAdd: AsyncRuleApplier;
  onDidAdd: AsyncRuleApplier;
  onProgress: (e: RegionizeProgressEvent) => void;
}
