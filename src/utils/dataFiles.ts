import type { OTPInfo } from "./otpUtils";
import { parseOTPUri } from "./otpUtils";

export interface DataFile {
  /** File name including the extension, e.g. "backup.json". */
  fileName: string;
  /** File name without the extension, used for display. */
  name: string;
  /** Path matched by Vite, e.g. "/data/backup.json". */
  path: string;
  /** Accounts found inside the file. */
  accounts: OTPInfo[];
}

// Vite includes every JSON file inside the project's data/ folder at build time.
// Adding or removing files is picked up automatically by the dev server.
const jsonModules = import.meta.glob<unknown>("/data/*.json", {
  eager: true,
  import: "default",
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildOTPInfo(entry: unknown): OTPInfo | null {
  if (!isRecord(entry)) return null;

  const secret = typeof entry.secret === "string" ? entry.secret.trim() : "";
  const uri = typeof entry.uri === "string" ? entry.uri.trim() : "";

  if (!secret && !uri) return null;

  const rawType =
    typeof entry.type === "string" ? entry.type.toLowerCase() : "";
  const type: OTPInfo["type"] =
    rawType === "hotp" || rawType === "totp"
      ? rawType
      : uri.startsWith("otpauth://hotp")
        ? "hotp"
        : "totp";

  const digits = Number(entry.digits);
  const period = Number(entry.period);
  const counter = Number(entry.counter);

  const account =
    typeof entry.account === "string"
      ? entry.account
      : typeof entry.name === "string"
        ? entry.name
        : "";

  return {
    type,
    issuer: typeof entry.issuer === "string" ? entry.issuer : "",
    account,
    secret,
    algorithm: typeof entry.algorithm === "string" ? entry.algorithm : "SHA1",
    digits: Number.isFinite(digits) && digits > 0 ? digits : 6,
    period:
      type === "totp" ? (Number.isFinite(period) && period > 0 ? period : 30) : undefined,
    counter: type === "hotp" ? (Number.isFinite(counter) ? counter : 0) : undefined,
    uri,
  };
}

async function parseEntry(entry: unknown): Promise<OTPInfo[]> {
  if (typeof entry === "string") {
    const parsed = await parseOTPUri(entry);
    if (!parsed) return [];
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  const info = buildOTPInfo(entry);
  if (!info) return [];

  // Entries without a secret only carry an otpauth URI: let the parser fill the rest.
  if (!info.secret) {
    const parsed = await parseOTPUri(info.uri);
    if (!parsed) return [];
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  return [info];
}

async function parseFileContents(raw: unknown): Promise<OTPInfo[]> {
  const entries = Array.isArray(raw) ? raw : [raw];
  const accounts: OTPInfo[] = [];

  for (const entry of entries) {
    accounts.push(...(await parseEntry(entry)));
  }

  return accounts;
}

export async function loadDataFiles(): Promise<DataFile[]> {
  const files = await Promise.all(
    Object.entries(jsonModules).map(async ([path, raw]) => {
      const fileName = path.split("/").pop() ?? path;

      return {
        path,
        fileName,
        name: fileName.replace(/\.json$/i, ""),
        accounts: await parseFileContents(raw),
      };
    })
  );

  return files.sort((a, b) => a.fileName.localeCompare(b.fileName));
}
