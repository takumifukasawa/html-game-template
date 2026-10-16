import {isDev} from '@/src/scripts/utilities/environments.ts';
import fingerTap1 from '@/src/assets/utilities/images/FingerTap1.png';
import fingerTap2 from '@/src/assets/utilities/images/FingerTap2.png';

const transformValue = 'translate(-15%, -25%) scale(1.2)';
const opacityValue = '0.7';

/**
 * 開発環境でタップ/クリック位置を視覚的に表示するインジケーター
 * Hキーで表示/非表示をトグル可能
 */
export class FingerTapIndicator {
    private enabled: boolean = false;
    private element: HTMLElement | null = null;
    private isPressed: boolean = false;
    private hideTimeout: number | null = null;
    private canvasObserver: MutationObserver | null = null;

    constructor() {
        // 本番環境では何もしない
        if (!isDev) return;

        this.init();
    }

    private init(): void {
        // インジケーター要素を作成
        this.createElement();

        // イベントリスナーを設定
        this.setupEventListeners();

        // スタイルを適用
        this.applyStyles();

        // 初期状態でカーソルを非表示
        this.updateCursorVisibility();
        
        // Canvasのスタイル変更を監視
        this.setupCanvasObserver();
    }

    private createElement(): void {
        this.element = document.createElement('div');
        this.element.id = 'finger-tap-indicator';
        this.element.style.backgroundImage = `url(${fingerTap1})`;
        document.body.appendChild(this.element);

        // 初期状態で非表示
        this.element.style.display = 'none';
    }

    private applyStyles(): void {
        if (!this.element) return;

        // CSSスタイルを動的に追加
        const style = document.createElement('style');
        style.textContent = `
            #finger-tap-indicator {
                position: fixed;
                width: 48px;
                height: 48px;
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
                pointer-events: none;
                z-index: 99999;
                opacity: ${opacityValue};
                transition: opacity 0.1s ease-out;
                transform: ${transformValue};
                // display: none;
            }

            #finger-tap-indicator.visible {
                display: block;
            }

            #finger-tap-indicator.show {
                opacity: ${opacityValue};
            }

            #finger-tap-indicator.pressed {
                transform: ${transformValue};
            }
        `;
        document.head.appendChild(style);
    }

    private setupEventListeners(): void {
        // マウスイベント
        document.addEventListener('mousedown', this.handlePointerDown.bind(this));
        document.addEventListener('mouseup', this.handlePointerUp.bind(this));
        document.addEventListener('mousemove', this.handlePointerMove.bind(this));

        // タッチイベント
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), {passive: false});
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), {passive: false});

        // キーボードショートカット（Hキー）
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    private handlePointerDown(event: MouseEvent): void {
        if (!this.enabled || !this.element) return;

        this.isPressed = true;
        this.element.style.backgroundImage = `url(${fingerTap2})`;
        this.element.classList.add('pressed');
        this.updatePosition(event.clientX, event.clientY);
        this.show();
    }

    private handlePointerUp(): void {
        if (!this.enabled || !this.element) return;

        this.isPressed = false;
        this.element.style.backgroundImage = `url(${fingerTap1})`;
        this.element.classList.remove('pressed');

        // カーソル代替なので非表示にしない
    }

    private handlePointerMove(event: MouseEvent): void {
        if (!this.enabled || !this.element) return;

        // 常に位置を更新（押下状態に関係なく）
        this.updatePosition(event.clientX, event.clientY);
    }

    private handleTouchStart(event: TouchEvent): void {
        if (!this.enabled || !this.element || event.touches.length === 0) return;

        const touch = event.touches[0];
        this.isPressed = true;
        this.element.style.backgroundImage = `url(${fingerTap2})`;
        this.element.classList.add('pressed');
        this.updatePosition(touch.clientX, touch.clientY);
        this.show();
    }

    private handleTouchEnd(): void {
        if (!this.enabled || !this.element) return;

        this.isPressed = false;
        this.element.style.backgroundImage = `url(${fingerTap1})`;
        this.element.classList.remove('pressed');

        // タッチデバイスでは非表示にする
        this.hideTimeout = window.setTimeout(() => {
            this.hide();
        }, 100);
    }

    private handleTouchMove(event: TouchEvent): void {
        if (!this.enabled || !this.element || !this.isPressed || event.touches.length === 0) return;

        const touch = event.touches[0];
        this.updatePosition(touch.clientX, touch.clientY);
    }

    private handleKeyDown(event: KeyboardEvent): void {
        // Hキーでトグル
        if (event.key === 'h' || event.key === 'H') {
            this.toggle();
        }
    }

    private updatePosition(x: number, y: number): void {
        if (!this.element) return;

        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
    }

    private show(): void {
        if (!this.element) return;

        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        this.element.classList.add('visible');
        // 少し遅延してからフェードイン
        requestAnimationFrame(() => {
            if (this.element) {
                this.element.classList.add('show');
            }
        });
    }

    private hide(): void {
        if (!this.element) return;

        this.element.classList.remove('show');
        // トランジション完了後に非表示
        setTimeout(() => {
            if (this.element) {
                this.element.classList.remove('visible');
            }
        }, 100);
    }

    private toggle(): void {
        this.enabled = !this.enabled;

        if (!this.enabled) {
            // 即座に非表示
            if (this.element) {
                this.element.style.display = 'none';
                this.element.classList.remove('visible', 'show');
            }
        } else {
            // 表示
            if (this.element) {
                this.element.style.display = 'block';
                this.element.classList.add('visible', 'show');
            }
        }

        // カーソルの表示/非表示を更新
        this.updateCursorVisibility();

        console.log(`FingerTapIndicator: ${this.enabled ? 'enabled' : 'disabled'}`);
    }

    private updateCursorVisibility(): void {
        // canvasがある場合、その上でカーソルを制御
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.style.cursor = this.enabled ? 'none' : 'auto';
        }

        // body全体でもカーソルを制御（任意）
        // document.body.style.cursor = this.enabled ? 'none' : 'auto';
    }

    private setupCanvasObserver(): void {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        // MutationObserverでcanvasのstyle属性の変更を監視
        this.canvasObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'style' &&
                    this.enabled) {
                    // カーソルスタイルが変更された場合、再度noneに設定
                    const currentCursor = canvas.style.cursor;
                    if (currentCursor !== 'none') {
                        canvas.style.cursor = 'none';
                    }
                }
            });
        });

        // 監視を開始
        this.canvasObserver.observe(canvas, { 
            attributes: true, 
            attributeFilter: ['style'] 
        });
    }

    /**
     * インジケーターを破棄
     */
    public destroy(): void {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        if (this.canvasObserver) {
            this.canvasObserver.disconnect();
            this.canvasObserver = null;
        }

        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}