
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

export const enum TraverseEvent {
  canSplitInside = 'canSplitInside',
  canSplitBetween = 'canSplitBetween',
  shouldTraverse = 'shouldTraverse',
  onSplit = 'onSplit',
  onAddStart = 'onAddStart',
  onAddFinish = 'onAddFinish',
  onAddCancel = 'onAddCancel'
}

export interface TraverseHandler {
  [TraverseEvent.canSplitInside]: (el: HTMLElement) => boolean;
  [TraverseEvent.canSplitBetween]: (el: HTMLElement, next: HTMLElement) => boolean;
  [TraverseEvent.shouldTraverse]: (el: HTMLElement) => boolean;
  [TraverseEvent.onAddStart]: (el: HTMLElement) => Promise<any>;
  [TraverseEvent.onAddFinish]: (el: HTMLElement) => Promise<any>;
  [TraverseEvent.onAddCancel]: (el: HTMLElement) => Promise<any>;
  [TraverseEvent.onSplit]: SplitRuleApplier;
}

export interface Plugin extends Readonly<Partial<TraverseHandler>> {
  readonly selector?: string;
}
