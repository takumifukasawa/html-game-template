/**
 * Recursive partial of a config object. Functions and arrays are treated as
 * leaves (replaced whole), plain objects recurse.
 */
export type DeepPartial<T> = T extends (...args: never[]) => unknown
    ? T
    : T extends readonly unknown[]
      ? T
      : T extends object
        ? {[K in keyof T]?: DeepPartial<T[K]>}
        : T;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype
    );
}

/**
 * Deep-assign `overrides` onto `target` IN PLACE and return it. Plain objects
 * merge recursively; everything else (numbers, strings, arrays, ...) is
 * replaced. `undefined` values are skipped.
 *
 * Typical use: a `?demo=1` profile that tweaks a few GameConfig values before
 * the first scene is created (see src/scripts/app/DemoProfile.ts).
 */
export function applyOverrides<T extends object>(target: T, overrides: DeepPartial<T>): T {
    const t = target as Record<string, unknown>;
    for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
        if (value === undefined) {
            continue;
        }
        const current = t[key];
        if (isPlainObject(current) && isPlainObject(value)) {
            applyOverrides(current, value as DeepPartial<Record<string, unknown>>);
        } else {
            t[key] = value;
        }
    }
    return target;
}
