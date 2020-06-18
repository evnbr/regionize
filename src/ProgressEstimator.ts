const sec = (ms: number) => (ms / 1000).toFixed(2);

class Estimator {
  addedCount = 0;
  timeWaiting = 0;
  startTime = window.performance.now();
  totalCount: number;

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
    const totalTime = endTime - this.startTime;
    const layoutTime = totalTime - this.timeWaiting;
    console.log(
      `📖 Layout ready in ${sec(layoutTime)}s (plus ${sec(
        this.timeWaiting,
      )}s waiting for images)`,
    );
  }
}

export default Estimator;
