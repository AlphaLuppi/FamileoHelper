import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const N = 16384;
const r = 8;
const p = 1;
const KEYLEN = 64;
const SALT_LEN = 16;

/**
 * Format: scrypt$N$r$p$<saltB64>$<hashB64>
 */
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8) throw new Error("password must be at least 8 characters");
  const salt = randomBytes(SALT_LEN);
  const hash = await scrypt(password, salt, KEYLEN);
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[4]!, "base64");
  const expected = Buffer.from(parts[5]!, "base64");
  const actual = await scrypt(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
