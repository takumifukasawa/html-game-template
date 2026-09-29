import {App} from "@/src/scripts/app/App.ts";
import {FingerTapIndicator} from "@/src/scripts/utilities/FingerTapIndicator.ts";
import {isDev} from "@/src/scripts/utilities/environments.ts";

const wrapperElement = document.getElementById("wrapper")!;
const canvasElement = document.createElement("canvas") as HTMLCanvasElement;
wrapperElement.appendChild(canvasElement);

// const ratio = Math.max(1.5, window.devicePixelRatio);
const ratio = 1.5;

const app = new App({canvas: canvasElement, ratio});

// 開発環境でのみフィンガータップインジケーターを初期化
if (isDev) {
    new FingerTapIndicator();
    // カーソルの制御はFingerTapIndicator内で管理
}

const update = (_time: number) => {
};

const getCurrentRealTime = () => performance.now() / 1000;

const setSize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    app.setSize(width, height);
}

const tick = () => {
    const time = getCurrentRealTime();
    update(time);
    window.requestAnimationFrame(tick);
};

setSize();
window.addEventListener("resize", setSize);
window.requestAnimationFrame(tick);