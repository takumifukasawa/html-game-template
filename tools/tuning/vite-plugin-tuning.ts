/**
 * Dev-server endpoint that writes tuning-panel changes back into a config
 * source file (e.g. src/scripts/app/GameConfig.ts), so the file stays the
 * single place values live (docs/decisions/0002-tuning-panel.md).
 *
 *   POST /__tuning/save  {"file": "<relative path>", "changes": [{"path": ["a", 0, "b"], "value": 1}]}
 *
 * Only literal leaves (number / string / boolean, optionally wrapped in
 * `as T` / `satisfies T` / parentheses) inside `export const <exportName> = {...}`
 * are rewritten, in place, so comments, types and formatting survive. Hex
 * numbers stay hex (colors). Writes made here do not trigger an HMR reload,
 * because the running page already holds the new values; hand edits still do.
 *
 * Template-owned (tools/template/paths.txt). Used from vite.config.ts.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import type {Plugin, ViteDevServer} from "vite";

export type TuningPluginOptions = {
    /** Config files the endpoint may write, relative to the project root, with the exported object's name. */
    files: {file: string; exportName: string}[];
};

type Change = {path: (string | number)[]; value: unknown};

const ENDPOINT = "/__tuning/save";

export function tuningPlugin(options: TuningPluginOptions): Plugin {
    let root = process.cwd();
    // Last content this plugin wrote per absolute path; used to skip HMR for our own writes.
    const lastWritten = new Map<string, string>();

    return {
        name: "tuning-save",
        apply: "serve",
        configResolved(config) {
            root = config.root;
        },
        configureServer(server: ViteDevServer) {
            server.middlewares.use(ENDPOINT, (req, res) => {
                if (req.method !== "POST") {
                    res.statusCode = 405;
                    res.end();
                    return;
                }
                let body = "";
                req.on("data", (chunk) => (body += chunk));
                req.on("end", () => {
                    try {
                        const {file, changes} = JSON.parse(body) as {file: string; changes: Change[]};
                        const entry = options.files.find((f) => f.file === file);
                        if (!entry) {
                            throw new Error(`not a registered tuning file: ${file}`);
                        }
                        const abs = path.resolve(root, entry.file);
                        const source = fs.readFileSync(abs, "utf8");
                        const next = applyChanges(source, entry.exportName, changes);
                        if (next !== source) {
                            lastWritten.set(abs, next);
                            fs.writeFileSync(abs, next);
                        }
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify({ok: true, written: changes.length}));
                    } catch (error) {
                        res.statusCode = 400;
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify({ok: false, error: String(error instanceof Error ? error.message : error)}));
                    }
                });
            });
        },
        handleHotUpdate(ctx) {
            const written = lastWritten.get(ctx.file);
            if (written !== undefined && fs.readFileSync(ctx.file, "utf8") === written) {
                // Our own write: the page already has these values. No reload.
                return [];
            }
            return undefined;
        },
    };
}

/** Rewrite the literal leaves at `changes[].path` inside `export const exportName = {...}`. */
export function applyChanges(source: string, exportName: string, changes: Change[]): string {
    const sf = ts.createSourceFile("config.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const rootObject = findExportedObject(sf, exportName);
    const edits: {start: number; end: number; text: string}[] = [];
    for (const change of changes) {
        const node = findLeaf(rootObject, change.path);
        edits.push({start: node.getStart(sf), end: node.getEnd(), text: literalText(node, change.value, sf)});
    }
    // Apply from the end so earlier offsets stay valid.
    edits.sort((a, b) => b.start - a.start);
    let out = source;
    for (const e of edits) {
        out = out.slice(0, e.start) + e.text + out.slice(e.end);
    }
    return out;
}

function unwrap(node: ts.Expression): ts.Expression {
    let n = node;
    while (ts.isAsExpression(n) || ts.isSatisfiesExpression(n) || ts.isParenthesizedExpression(n)) {
        n = n.expression;
    }
    return n;
}

function findExportedObject(sf: ts.SourceFile, exportName: string): ts.ObjectLiteralExpression {
    for (const stmt of sf.statements) {
        if (!ts.isVariableStatement(stmt)) {
            continue;
        }
        for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === exportName && decl.initializer) {
                const init = unwrap(decl.initializer);
                if (ts.isObjectLiteralExpression(init)) {
                    return init;
                }
            }
        }
    }
    throw new Error(`export const ${exportName} = {...} not found`);
}

function propertyName(name: ts.PropertyName): string | null {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
        return name.text;
    }
    return null;
}

function findLeaf(rootObject: ts.ObjectLiteralExpression, keyPath: (string | number)[]): ts.Expression {
    let node: ts.Expression = rootObject;
    for (const key of keyPath) {
        const current = unwrap(node);
        if (ts.isObjectLiteralExpression(current)) {
            const prop = current.properties.find(
                (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && propertyName(p.name) === String(key),
            );
            if (!prop) {
                throw new Error(`key not found: ${keyPath.join(".")} (at ${key})`);
            }
            node = prop.initializer;
        } else if (ts.isArrayLiteralExpression(current) && typeof key === "number") {
            const el = current.elements[key];
            if (!el) {
                throw new Error(`index out of range: ${keyPath.join(".")}`);
            }
            node = el;
        } else {
            throw new Error(`cannot descend into ${keyPath.join(".")} at ${key}`);
        }
    }
    // Replace only the literal itself; keep a wrapping `as T`.
    const leaf = unwrap(node);
    if (!isLiteralLeaf(leaf)) {
        throw new Error(`not a literal value: ${keyPath.join(".")}`);
    }
    return leaf;
}

function isLiteralLeaf(n: ts.Expression): boolean {
    return (
        ts.isNumericLiteral(n) ||
        ts.isStringLiteral(n) ||
        ts.isNoSubstitutionTemplateLiteral(n) ||
        n.kind === ts.SyntaxKind.TrueKeyword ||
        n.kind === ts.SyntaxKind.FalseKeyword ||
        (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(n.operand))
    );
}

function literalText(node: ts.Expression, value: unknown, sf: ts.SourceFile): string {
    const original = node.getText(sf);
    if (typeof value === "boolean") {
        return String(value);
    }
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            throw new Error(`not a finite number: ${value}`);
        }
        if (/^0x/i.test(original) && Number.isInteger(value) && value >= 0) {
            const digits = original.length - 2;
            return `0x${value.toString(16).padStart(digits, "0")}`;
        }
        // Keep float noise out of the source (0.30000000000000004 -> 0.3).
        return String(Number(value.toPrecision(12)));
    }
    if (typeof value === "string") {
        const quote = original.startsWith("'") ? "'" : '"';
        const escaped = value.replace(/\\/g, "\\\\").replace(new RegExp(quote, "g"), `\\${quote}`);
        return `${quote}${escaped}${quote}`;
    }
    throw new Error(`unsupported value type: ${typeof value}`);
}
