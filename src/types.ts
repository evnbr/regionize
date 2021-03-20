export type SplitRuleApplier = (
  original: HTMLElement,
  clone: HTMLElement,
  cloneWithRules: (el: HTMLElement) => HTMLElement,
) => void;

export enum TraverseEvent {
  canSplitInside = 'canSplitInside',
  canSplitBetween = 'canSplitBetween',
  canSkipTraverse = 'canSkipTraverse',
  getMinHeight = 'getMinHeight',
  onAddStart = 'onAddStart',
  onAddFinish = 'onAddFinish',
  onAddCancel = 'onAddCancel',
  onSplitFinish = 'onSplitFinish',
}

export interface TraverseHandler {
  [TraverseEvent.canSplitInside]: (el: HTMLElement) => boolean;
  [TraverseEvent.canSplitBetween]: (el: HTMLElement, next: HTMLElement) => boolean;
  [TraverseEvent.getMinHeight]: (el: HTMLElement) => number | undefined;
  [TraverseEvent.canSkipTraverse]: (el: HTMLElement) => boolean;
  [TraverseEvent.onAddStart]: (el: HTMLElement) => Promise<void>;
  [TraverseEvent.onAddFinish]: (el: HTMLElement) => Promise<void>;
  [TraverseEvent.onAddCancel]: (el: HTMLElement) => Promise<void>;
  [TraverseEvent.onSplitFinish]: SplitRuleApplier;
}

export interface Plugin extends Readonly<Partial<TraverseHandler>> {
  readonly selector?: string;
}

export const allPluginKeys = ['selector', ...Object.values(TraverseEvent)];