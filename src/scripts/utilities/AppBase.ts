export type AppConstructor = {
    canvas: HTMLCanvasElement;
    ratio: number;
};

export class AppBase {
    canvas: HTMLCanvasElement;
    ratio: number;
    startTime: number = -1;

    constructor(args: AppConstructor) {
        this.canvas = args.canvas;
        this.ratio = args.ratio;
    }

    start(time: number) {
        this.startTime = time;
    }

    setSize(_width: number, _height: number) {
    }

    fixedUpdate(_time: number, _deltaTime: number) {
    }

    update(_time: number, _deltaTime: number) {
    }

    render(_time: number, _deltaTime: number) {
    }
}
