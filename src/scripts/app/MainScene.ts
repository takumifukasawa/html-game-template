import Phaser from "phaser";
import {LocalStore} from "@/src/scripts/core/LocalStore.ts";
import {listenTapOutsideCanvas} from "@/src/scripts/core/globalTap.ts";
import {GameConfig} from "./GameConfig.ts";

type GameState = "ready" | "playing" | "gameover";

const BALL_TEXTURE = "ball";

/**
 * Sample scene -- replace it with the real game.
 *
 * A ball falls under gravity and ping-pongs between the side walls; tap
 * anywhere to hop. Falling off the bottom is game over; score = seconds
 * survived. It exists to show the template wiring in one place:
 *  - values come from GameConfig and scale with the screen height
 *  - the best score persists through core/LocalStore
 *  - taps on the letterbox bars outside the canvas also count
 *  - resize is handled
 *  - `state` / `onTap()` / `ball` are public so tools/capture/autopilot.cjs
 *    can drive the game through the same code path as a real tap.
 */
export class MainScene extends Phaser.Scene {
    state: GameState = "ready";
    ball!: Phaser.Physics.Matter.Image;

    private scaleFactor = 1;
    private lastWidth = 0;
    private lastHeight = 0;
    private readonly store = new LocalStore(GameConfig.save.namespace);
    private score = 0;
    private best = 0;
    private startedAt = 0;
    private gameOverAt = 0;
    private walls: MatterJS.BodyType[] = [];
    private wallGraphics!: Phaser.GameObjects.Graphics;
    private scoreText!: Phaser.GameObjects.Text;
    private bestText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;

    constructor() {
        super({key: "MainScene"});
    }

    create(): void {
        const {width, height} = this.scale;
        this.state = "ready";
        this.scaleFactor = height / GameConfig.design.refHeight;
        this.lastWidth = width;
        this.lastHeight = height;
        this.score = 0;
        this.best = this.store.getNumber("best", 0);

        this.matter.world.setGravity(0, GameConfig.physics.gravityY * this.scaleFactor);

        this.createBallTexture();
        this.wallGraphics = this.add.graphics();
        this.buildWalls();
        this.createBall(width, height);
        this.createHud();

        this.input.on("pointerdown", this.onTap, this);
        const disposeGlobalTap = listenTapOutsideCanvas(this.game.canvas, () => this.onTap());
        this.scale.on("resize", this.onResize, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            // Game objects and bodies are destroyed by the scene shutdown
            // itself; only detach the global listeners here.
            this.scale.off("resize", this.onResize, this);
            disposeGlobalTap();
        });
    }

    update(): void {
        if (this.state !== "playing") {
            return;
        }
        this.score = Math.floor((this.time.now - this.startedAt) / 1000);
        this.scoreText.setText(String(this.score));
        if (this.ball.y - this.ballRadius > this.scale.height) {
            this.onGameOver();
        }
    }

    /** The single input verb. Public so the capture autopilot can call it. */
    onTap(): void {
        const s = this.scaleFactor;
        switch (this.state) {
            case "ready":
                this.state = "playing";
                this.startedAt = this.time.now;
                this.hintText.setVisible(false);
                this.ball.setStatic(false);
                this.ball.setVelocity(
                    GameConfig.physics.horizontalSpeed * s,
                    -GameConfig.physics.jumpVelocity * s,
                );
                break;
            case "playing":
                // Overwrite vy only; vx keeps the wall-to-wall bounce going.
                this.ball.setVelocityY(-GameConfig.physics.jumpVelocity * s);
                break;
            case "gameover":
                if (this.time.now - this.gameOverAt > GameConfig.flow.retryLockMs) {
                    this.scene.restart();
                }
                break;
        }
    }

    private get ballRadius(): number {
        return GameConfig.ball.radius * this.scaleFactor;
    }

    private createBallTexture(): void {
        if (this.textures.exists(BALL_TEXTURE)) {
            this.textures.remove(BALL_TEXTURE);
        }
        const r = Math.ceil(this.ballRadius);
        const g = this.make.graphics({x: 0, y: 0}, false);
        g.fillStyle(GameConfig.colors.ball, 1);
        g.fillCircle(r, r, r);
        g.generateTexture(BALL_TEXTURE, r * 2, r * 2);
        g.destroy();
    }

    private createBall(width: number, height: number): void {
        this.ball = this.matter.add.image(
            width * GameConfig.ball.spawnXRatio,
            height * GameConfig.ball.spawnYRatio,
            BALL_TEXTURE,
        );
        this.ball.setCircle(this.ballRadius);
        this.ball.setBounce(GameConfig.physics.restitution);
        this.ball.setFriction(0, 0, 0);
        this.ball.setStatic(true);
    }

    private buildWalls(): void {
        const {width, height} = this.scale;
        const t = GameConfig.physics.wallThickness * this.scaleFactor;
        if (this.walls.length > 0) {
            this.matter.world.remove(this.walls);
        }
        const options = {
            isStatic: true,
            restitution: GameConfig.physics.restitution,
            friction: 0,
            frictionStatic: 0,
        };
        this.walls = [
            this.matter.add.rectangle(-t / 2, height / 2, t, height * 4, options), // left
            this.matter.add.rectangle(width + t / 2, height / 2, t, height * 4, options), // right
            this.matter.add.rectangle(width / 2, -t / 2, width * 4, t, options), // ceiling
        ];

        const g = this.wallGraphics;
        g.clear();
        g.lineStyle(4 * this.scaleFactor, GameConfig.colors.wall, 1);
        g.lineBetween(2, 0, 2, height);
        g.lineBetween(width - 2, 0, width - 2, height);
    }

    private createHud(): void {
        const {width, height} = this.scale;
        const s = this.scaleFactor;
        const style = (px: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
            fontFamily: GameConfig.ui.fontFamily,
            fontSize: `${Math.round(px * s)}px`,
            color,
            align: "center",
        });
        this.bestText = this.add
            .text(width / 2, 20 * s, `BEST ${this.best}`, style(28, GameConfig.colors.hint))
            .setOrigin(0.5, 0)
            .setVisible(GameConfig.ui.showBest);
        this.scoreText = this.add
            .text(width / 2, 60 * s, "0", style(72, GameConfig.colors.text))
            .setOrigin(0.5, 0);
        this.hintText = this.add
            .text(width / 2, height * 0.78, "TAP TO START", style(40, GameConfig.colors.hint))
            .setOrigin(0.5);
    }

    private onGameOver(): void {
        this.state = "gameover";
        this.gameOverAt = this.time.now;
        this.ball.setStatic(true);
        if (this.score > this.best) {
            this.best = this.score;
            this.store.setNumber("best", this.best);
            this.bestText.setText(`BEST ${this.best}`);
        }
        this.hintText.setText(`SCORE ${this.score}\nTAP TO RETRY`).setVisible(true);
    }

    private onResize(): void {
        const {width, height} = this.scale;
        // scale.refresh() re-emits RESIZE with the same size; only real changes matter.
        if (width === this.lastWidth && height === this.lastHeight) {
            return;
        }
        this.lastWidth = width;
        this.lastHeight = height;
        if (this.state === "ready") {
            // Nothing is in motion yet: rebuild everything for the new size.
            this.scene.restart();
            return;
        }
        const s = this.scaleFactor;
        this.buildWalls();
        const r = this.ballRadius;
        this.ball.setPosition(Phaser.Math.Clamp(this.ball.x, r, width - r), Math.min(this.ball.y, height * 0.9));
        this.bestText.setPosition(width / 2, 20 * s);
        this.scoreText.setPosition(width / 2, 60 * s);
        this.hintText.setPosition(width / 2, height * 0.78);
    }
}
