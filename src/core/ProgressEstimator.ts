export type EventName = 'inProgress' | 'imageLoading' | 'done';

export interface ProgressEvent {
  state: EventName;
  estimatedProgress: number;
  imageName?: string;
  totalTime?: number;
  imageWaitTime?: number;
}

export class ProgressEstimator {
  private callback: (e: ProgressEvent) => void;

  private addedCount = 0;
  private timeWaiting = 0;
  private layoutTime = 0;
  private startTime = 0;
  private totalCount = 0;
  private totalTime = 0;

  constructor(callback: (e: ProgressEvent) => void) {
    this.callback = callback;
  }

  begin(elementCount: number) {
    this.totalCount = elementCount;
    this.startTime = window.performance.now();
  }

  incrementAddedCount() {
    this.addedCount += 1;
    this.emit('inProgress');
  }

  addWaitTime(t: number) {
    this.timeWaiting += t;
  }

  getPercentComplete() {
    return this.addedCount / this.totalCount;
  }

  end() {
    const endTime = window.performance.now();
    this.totalTime = endTime - this.startTime;
    this.layoutTime = this.totalTime - this.timeWaiting;

    this.emit('done');
  }

  private emit(eventName: EventName) {
    if (eventName === 'done') {
      this.callback({
        state: eventName,
        estimatedProgress: 1,
        totalTime: this.totalTime,
        imageWaitTime: this.timeWaiting,
      });
    }
    else {
      this.callback({
        state: eventName,
        estimatedProgress: this.getPercentComplete(),
      });
    }
  }
}
