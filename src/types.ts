
export interface OverflowDetector {
  readonly element: HTMLElement;
  append(...nodes: (string | Node)[]): void;
  hasOverflowed(): boolean;
}

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

export type SplitRuleApplier = (
  original: HTMLElement,
  clone: HTMLElement,
  cloneWithRules: (el: HTMLElement) => HTMLElement,
) => void;

export interface TraverseHandler {
  canSplitInside: (el: HTMLElement) => boolean;
  canSplitBetween: (el: HTMLElement, next: HTMLElement) => boolean;
  shouldTraverse: (el: HTMLElement) => boolean;
  onAddStart: (el: HTMLElement) => Promise<any>;
  onAddFinish: (el: HTMLElement) => Promise<any>;
  onAddCancel: (el: HTMLElement) => Promise<any>;
  onSplit: SplitRuleApplier;
}

export interface Plugin extends Readonly<Partial<TraverseHandler>> {
  readonly selector?: string;
}
