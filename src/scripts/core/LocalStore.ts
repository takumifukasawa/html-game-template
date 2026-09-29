/**
 * Namespaced key/value persistence on localStorage.
 *
 * Every access is guarded: Safari private mode, blocked storage, quota errors
 * etc. can throw, in which case reads return the fallback and writes are
 * silently skipped (the value just won't persist).
 */
export class LocalStore {
    private readonly prefix: string;

    constructor(namespace: string) {
        this.prefix = `${namespace}:`;
    }

    getString(key: string, fallback = ""): string {
        const raw = this.getRaw(key);
        return raw === null ? fallback : raw;
    }

    setString(key: string, value: string): void {
        this.setRaw(key, value);
    }

    getNumber(key: string, fallback = 0): number {
        const raw = this.getRaw(key);
        if (raw === null) {
            return fallback;
        }
        const value = Number(raw);
        return Number.isFinite(value) ? value : fallback;
    }

    setNumber(key: string, value: number): void {
        this.setRaw(key, String(value));
    }

    getJSON<T>(key: string, fallback: T): T {
        const raw = this.getRaw(key);
        if (raw === null) {
            return fallback;
        }
        try {
            return JSON.parse(raw) as T;
        } catch {
            return fallback;
        }
    }

    setJSON(key: string, value: unknown): void {
        this.setRaw(key, JSON.stringify(value));
    }

    remove(key: string): void {
        try {
            window.localStorage.removeItem(this.prefix + key);
        } catch {
            // Storage unavailable: nothing to remove.
        }
    }

    private getRaw(key: string): string | null {
        try {
            return window.localStorage.getItem(this.prefix + key);
        } catch {
            return null;
        }
    }

    private setRaw(key: string, value: string): void {
        try {
            window.localStorage.setItem(this.prefix + key, value);
        } catch {
            // Storage unavailable: silently skip.
        }
    }
}
