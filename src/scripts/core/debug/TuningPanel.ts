import type {BindingParams, FolderApi} from "tweakpane";
import {Pane} from "tweakpane";

/**
 * Dev-only tuning panel (Tweakpane) over a live config object, with save back
 * into the config's source file through tools/tuning/vite-plugin-tuning.ts.
 * Engine-agnostic; template-owned (docs/TEMPLATE.md).
 *
 * Load it ONLY behind `import.meta.env.DEV` with a dynamic import, so neither
 * this file nor Tweakpane reaches the production bundle:
 *
 *   if (import.meta.env.DEV && hasQueryFlag("debug")) {
 *       void import("@/src/scripts/core/debug/TuningPanel.ts").then((m) => m.mountTuningPanel({...}));
 *   }
 *
 * Every number / string / boolean leaf becomes a control; objects and arrays
 * become folders. Edits mutate the object in place (so code that reads the
 * config every frame sees them at once) and are reported through `onChange`
 * so the game can re-create what it only builds once. "Save" writes only the
 * edited leaves into the source file, without reloading the page.
 */
export type TuningPath = (string | number)[];

export type TuningPanelOptions = {
    /** The live config object (mutated in place). */
    config: object;
    /** Source file of the config, relative to the project root. Must be registered in the Vite plugin. */
    file: string;
    title?: string;
    /** Extra Tweakpane params per dotted path, e.g. {"control.mode": {options: {follow: "follow", spring: "spring"}}}. */
    hints?: Record<string, BindingParams>;
    /** Return false to leave a path (and everything under it) out of the panel. */
    include?: (path: TuningPath) => boolean;
    /** Called after every edit. */
    onChange?: (path: TuningPath, value: unknown) => void;
    /**
     * Paths the running page cannot apply (e.g. renderer resolution). Editing one saves all
     * unsaved edits and reloads, so the new value is what the page boots with.
     */
    reloadOn?: (path: TuningPath) => boolean;
    /** Start with the panel open. Default: false (only the title bar shows; better on phones). */
    expanded?: boolean;
};

const ENDPOINT = "/__tuning/save";
const COLOR_KEY = /colou?r/i;

type Leaf = number | string | boolean;

export function mountTuningPanel(options: TuningPanelOptions): {dispose: () => void} {
    const title = options.title ?? "Tuning";
    const container = document.createElement("div");
    Object.assign(container.style, {
        position: "fixed",
        top: "8px",
        right: "8px",
        width: "300px",
        maxWidth: "calc(100vw - 16px)",
        maxHeight: "calc(100vh - 16px)",
        overflowY: "auto",
        zIndex: "1000",
    });
    document.body.appendChild(container);
    // Phaser also listens on window and hit-tests presses that start outside the canvas, so a tap on the
    // panel would press the game button under it too. Stop presses at the panel (only the start events:
    // the panel's own drags listen for move / up on the document).
    for (const type of ["pointerdown", "mousedown", "touchstart"]) {
        container.addEventListener(type, (e) => e.stopPropagation());
    }

    const pane = new Pane({container, title, expanded: options.expanded ?? false});
    const dirty = new Map<string, {path: TuningPath; value: Leaf}>();
    const setTitle = (note?: string) => {
        const count = dirty.size ? ` (${dirty.size} unsaved)` : "";
        pane.title = `${title}${count}${note ? ` - ${note}` : ""}`;
    };

    const save = async (): Promise<boolean> => {
        if (dirty.size === 0) {
            setTitle("nothing to save");
            return true;
        }
        const changes = [...dirty.values()];
        try {
            const res = await fetch(ENDPOINT, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({file: options.file, changes}),
            });
            const body = (await res.json()) as {ok: boolean; error?: string};
            if (!body.ok) {
                throw new Error(body.error ?? res.statusText);
            }
            dirty.clear();
            setTitle("saved");
            return true;
        } catch (error) {
            setTitle(`save failed: ${error instanceof Error ? error.message : String(error)}`);
            console.error("[tuning] save failed", error);
            return false;
        }
    };

    pane.addButton({title: "Save"}).on("click", () => void save());
    pane.addButton({title: "Save & reload"}).on("click", () => {
        void save().then((ok) => ok && location.reload());
    });
    pane.addButton({title: "Discard (reload)"}).on("click", () => location.reload());
    pane.addButton({title: "Copy unsaved as JSON"}).on("click", () => {
        const json = JSON.stringify([...dirty.values()], null, 2);
        void navigator.clipboard?.writeText(json).then(
            () => setTitle("copied"),
            () => console.log("[tuning] unsaved changes\n" + json),
        );
    });

    const onLeafChange = (path: TuningPath, value: Leaf) => {
        dirty.set(JSON.stringify(path), {path, value});
        setTitle();
        options.onChange?.(path, value);
        if (options.reloadOn?.(path)) {
            setTitle("reloading...");
            void save().then((ok) => ok && location.reload());
        }
    };
    buildFolder(pane, options.config as Record<string | number, unknown>, [], options, onLeafChange);

    return {
        dispose: () => {
            pane.dispose();
            container.remove();
        },
    };
}

function buildFolder(
    folder: FolderApi,
    target: Record<string | number, unknown>,
    parent: TuningPath,
    options: TuningPanelOptions,
    onLeafChange: (path: TuningPath, value: Leaf) => void,
): void {
    const keys: (string | number)[] = Array.isArray(target) ? target.map((_, i) => i) : Object.keys(target);
    for (const key of keys) {
        const path = [...parent, key];
        if (options.include && !options.include(path)) {
            continue;
        }
        const value = target[key];
        if (value !== null && typeof value === "object") {
            const label = labelFor(key, value);
            const sub = folder.addFolder({title: label, expanded: false});
            buildFolder(sub, value as Record<string | number, unknown>, path, options, onLeafChange);
            continue;
        }
        if (typeof value !== "number" && typeof value !== "string" && typeof value !== "boolean") {
            continue;
        }
        const params: BindingParams = {label: String(key), ...(options.hints?.[path.join(".")] ?? {})};
        if (typeof value === "number" && isColorPath(path) && !("view" in params)) {
            Object.assign(params, {view: "color"});
        }
        folder.addBinding(target, key as never, params).on("change", (ev) => {
            onLeafChange(path, ev.value as Leaf);
        });
    }
}

/** Array rows with an `id` get it as their folder title (e.g. enemy types). */
function labelFor(key: string | number, value: object): string {
    const id = (value as {id?: unknown}).id;
    return typeof id === "string" && id !== String(key) ? `${key}: ${id}` : String(key);
}

function isColorPath(path: TuningPath): boolean {
    return path.some((k) => typeof k === "string" && COLOR_KEY.test(k));
}
