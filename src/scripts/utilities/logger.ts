import { isDev } from '@/src/scripts/utilities/environments.ts';

/**
 * 環境に応じてログ出力を制御するユーティリティ
 * 本番環境では一切のログを出力しない
 */
export const logger = {
    /**
     * 通常のログ出力
     */
    log: (...args: any[]) => {
        if (isDev) {
            console.log(...args);
        }
    },

    /**
     * エラーログ出力
     */
    error: (...args: any[]) => {
        if (isDev) {
            console.error(...args);
        }
    },

    /**
     * 警告ログ出力
     */
    warn: (...args: any[]) => {
        if (isDev) {
            console.warn(...args);
        }
    },

    /**
     * 情報ログ出力
     */
    info: (...args: any[]) => {
        if (isDev) {
            console.info(...args);
        }
    },

    /**
     * デバッグログ出力
     */
    debug: (...args: any[]) => {
        if (isDev) {
            console.debug(...args);
        }
    }
};