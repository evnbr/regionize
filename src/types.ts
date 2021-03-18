export type SplitRuleApplier = (
  original: HTMLElement,
  clone: HTMLElement,
  cloneWithRules: (el: HTMLElement) => HTMLElement,
) => void;

export const enum TraverseEvent {
  canSplitInside = 'canSplitInside',
  canSplitBetween = 'canSplitBetween',
  canSkipTraverse = 'canSkipTraverse',
  onAddStart = 'onAddStart',
  onAddFinish = 'onAddFinish',
  onAddCancel = 'onAddCancel',
  onSplitFinish = 'onSplitFinish',
}

export interface TraverseHandler {
  [TraverseEvent.canSplitInside]: (el: HTMLElement) => boolean;
  [TraverseEvent.canSplitBetween]: (el: HTMLElement, next: HTMLElement) => boolean;
  [TraverseEvent.canSkipTraverse]: (el: HTMLElement) => boolean;
  [TraverseEvent.onAddStart]: (el: HTMLElement) => Promise<void>;
  [TraverseEvent.onAddFinish]: (el: HTMLElement) => Promise<void>;
  [TraverseEvent.onAddCancel]: (el: HTMLElement) => Promise<void>;
  [TraverseEvent.onSplitFinish]: SplitRuleApplier;
}

export interface Plugin extends Readonly<Partial<TraverseHandler>> {
  readonly selector?: string;
}
