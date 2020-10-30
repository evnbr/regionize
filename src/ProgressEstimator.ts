const sec = (ms: number) => (ms / 1000).toFixed(2);

class Estimator {
  addedCount = 0;
  timeWaiting = 0;
  startTime = window.performance.now();
  totalCount: number;
  totalTime = 0;
  layoutTime = 0;

  constructor(elementCount: number) {
    this.totalCount = elementCount;
  }
  incrementAddedCount() {
    this.addedCount += 1;
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
  }
}

export default Estimator;
