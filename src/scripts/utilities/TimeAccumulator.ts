type Callback = (lastTime: number, interval: number) => void;

export class TimeAccumulator {
    targetFPS: number;
    maxChaseCount: number;
    callback: Callback;
    lastTime: number = -Infinity

    constructor(targetFPS: number, callback: Callback, maxChaseCount: number = 60) {
        this.targetFPS = targetFPS;
        this.callback = callback;
        this.maxChaseCount = maxChaseCount;
    }

    start(time: number) {
        this.lastTime = time;
    }

    exec(time: number) {
        const interval = 1 / this.targetFPS;

        if (time - interval >= this.lastTime) {
            const elapsedTime = time - this.lastTime;
            const n = Math.floor(elapsedTime / interval);

            if (n > this.maxChaseCount) {
                console.warn('[TimeAccumulator.exec] jump frame');
                this.lastTime += interval * n;
                this.callback(this.lastTime, interval);
                return;
            }

            const loopNum = Math.min(this.maxChaseCount, n);
            for (let i = 0; i < loopNum; i++) {
                this.lastTime += interval;
                this.callback(this.lastTime, interval);
            }
        }
    }
}
