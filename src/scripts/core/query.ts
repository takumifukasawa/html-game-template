/** URL query helpers (safe to call where `location` does not exist). */

export function queryParams(): URLSearchParams {
    return typeof location === "undefined" ? new URLSearchParams() : new URLSearchParams(location.search);
}

/** `?demo`, `?demo=1`, `?demo=true` -> true. `?demo=0` / `?demo=false` / absent -> false. */
export function hasQueryFlag(name: string): boolean {
    const value = queryParams().get(name);
    return value !== null && value !== "0" && value !== "false";
}

export function getQueryNumber(name: string, fallback: number): number {
    const raw = queryParams().get(name);
    if (raw === null || raw.trim() === "") {
        return fallback;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
}
