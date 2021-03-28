export const enum AppendStatus {
  ADDED_ALL = 'all',
  ADDED_PARTIAL = 'partial',
  ADDED_NONE = 'none',
}

type WholeNodeAppendResult = {
  status: AppendStatus.ADDED_ALL | AppendStatus.ADDED_NONE;
};

type PartialNodeAppendResult = {
  status: AppendStatus.ADDED_PARTIAL;
  remainder: Text | HTMLElement;
};

export type AppendResult = WholeNodeAppendResult | PartialNodeAppendResult;
