export type AppConstructor = {
    canvas: HTMLCanvasElement;
    ratio: number;
};

export class AppBase {
    canvas: HTMLCanvasElement;
    ratio: number;
    startTime: number = -1;
    engagementInterval: number = 30;
    lastEngagementTime: number = 0;

    constructor(args: AppConstructor) {
        this.canvas = args.canvas;
        this.ratio = args.ratio;
    }

    start(time: number) {
        this.startTime = time;
        this.lastEngagementTime = this.startTime;
    }

    setSize(_width: number, _height: number) {
    }

    fixedUpdate(_time: number, _deltaTime: number) {
    }

    update(time: number, _deltaTime: number) {
        if (time - this.lastEngagementTime >= this.engagementInterval) {
            this.lastEngagementTime = time;
            // Hook: send an engagement event here once analytics is wired up.
        }
    }

    render(_time: number, _deltaTime: number) {
    }

    startLevel() {
        // Hook: send a level-start event here once analytics is wired up.
    }

    endLevel() {
        // Hook: send a level-end event here once analytics is wired up.
    }
}
