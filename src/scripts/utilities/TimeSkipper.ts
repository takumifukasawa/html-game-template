type Callback = (lastTime: number, deltaTime: number) => void;

export class TimeSkipper {
    targetFPS: number;
    callback: Callback;
    lastTime: number = -Infinity;

    constructor(targetFPS: number, callback: Callback) {
        this.targetFPS = targetFPS;
        this.callback = callback;
    };

    start(time: number) {
        this.lastTime = time;
    }

    exec(time: number) {
        const interval = 1 / this.targetFPS;
        if (time - interval >= this.lastTime) {
            const elapsedTime = time - this.lastTime;
            const n = Math.floor(elapsedTime / interval);
            const deltaTime = interval * n;
            this.lastTime += deltaTime;
            this.callback(this.lastTime, deltaTime);
        }
    }
}
