import type Region from './Region';

export type ElementChecker = (el: HTMLElement) => boolean;

export const enum AppendStatus {
  ADDED_ALL = 'all',
  ADDED_PARTIAL = 'partial',
  ADDED_NONE = 'none',
}

type WholeNodeAppendResult = {
  status: AppendStatus.ADDED_ALL | AppendStatus.ADDED_NONE;
}

type PartialNodeAppendResult = {
  status: AppendStatus.ADDED_PARTIAL;
  remainder: Node;
}

export type AppendResult = WholeNodeAppendResult | PartialNodeAppendResult;



export type AsyncRuleApplier = (el: HTMLElement) => Promise<any> | undefined;

export type SplitRuleApplier = (
  original: HTMLElement,
  clone: HTMLElement,
  nextChild?: HTMLElement,
  cloner?: (el: HTMLElement) => HTMLElement,
) => void;

export type ProgressEventName = 'inProgress' | 'imageLoading' | 'done';

export interface RegionizeProgressEvent {
  state: ProgressEventName;
  estimatedProgress: number;
  imageName?: string;
  totalTime?: number;
  imageWaitTime?: number;
}

export interface RegionizeConfig {
  createRegion: () => Region;
  onDidSplit: SplitRuleApplier;
  canSplit: ElementChecker;
  shouldTraverse: ElementChecker;
  onWillAdd: AsyncRuleApplier;
  onDidAdd: AsyncRuleApplier;
  onDidRemove: AsyncRuleApplier;
  onProgress: (e: RegionizeProgressEvent) => void;
}
