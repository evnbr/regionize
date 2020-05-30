const sec = (ms: number) => (ms / 1000).toFixed(2);

class Estimator {
  completed = 0;
  timeWaiting = 0;
  startTime = window.performance.now();
  capacity: number;

  constructor(elementCount: number) {
    this.capacity = elementCount;
  }
  increment() {
    this.completed += 1;
  }
  addWaitTime(t: number) {
    this.timeWaiting += t;
  }
  get percentComplete() {
    return this.completed / this.capacity;
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
