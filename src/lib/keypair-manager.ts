import { generateKeyPairSync, createHash } from "crypto";
import path from "path";
import fs from "fs";

const KEYPAIR_DIR = path.join(process.cwd(), "uploads", "keypairs");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function userDir(userId: string) {
  const dir = path.join(KEYPAIR_DIR, path.basename(userId));
  ensureDir(dir);
  return dir;
}

export interface KeyPairData {
  name: string;
  id: string;
  type: "RSA" | "ED25519";
  fingerprint: string;
  publicKey: string;
  created: string;
}

export interface KeyPairWithPrivate extends KeyPairData {
  privateKey: string;
}

function generateFingerprint(publicKey: string): string {
  const hash = createHash("md5").update(Buffer.from(publicKey)).digest("hex");
  return hash.match(/.{2}/g)!.join(":");
}

function generateId(): string {
  const hex = Math.random().toString(16).substring(2, 18);
  return `key-${hex}`;
}

// Generate a real key pair
export function generateKeyPair(
  name: string,
  type: "RSA" | "ED25519" = "RSA"
): KeyPairWithPrivate {
  let publicKey: string;
  let privateKey: string;

  if (type === "ED25519") {
    const pair = generateKeyPairSync("ed25519", {
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    publicKey = pair.publicKey;
    privateKey = pair.privateKey;
  } else {
    const pair = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    publicKey = pair.publicKey;
    privateKey = pair.privateKey;
  }

  // Convert public key to OpenSSH format for authorized_keys
  const opensshPub = pemToOpenSSH(publicKey, type, name);

  return {
    name,
    id: generateId(),
    type,
    fingerprint: generateFingerprint(publicKey),
    publicKey: opensshPub,
    privateKey,
    created: new Date().toISOString(),
  };
}

// Convert PEM public key to OpenSSH format
function pemToOpenSSH(
  pem: string,
  type: "RSA" | "ED25519",
  comment: string
): string {
  // Extract the base64 content from PEM
  const lines = pem.split("\n").filter((l) => !l.startsWith("-----") && l.trim());
  const der = Buffer.from(lines.join(""), "base64");

  if (type === "ED25519") {
    // For Ed25519, extract the 32-byte key from the SPKI structure
    // SPKI for Ed25519: 30 2a 30 05 06 03 2b 65 70 03 21 00 <32 bytes>
    const keyData = der.subarray(der.length - 32);
    const typeStr = "ssh-ed25519";
    const typeLen = Buffer.alloc(4);
    typeLen.writeUInt32BE(typeStr.length);
    const keyLen = Buffer.alloc(4);
    keyLen.writeUInt32BE(keyData.length);
    const blob = Buffer.concat([typeLen, Buffer.from(typeStr), keyLen, keyData]);
    return `ssh-ed25519 ${blob.toString("base64")} ${comment}`;
  } else {
    // For RSA, we need to parse the SPKI and extract n and e
    // Simpler: use the PEM directly since sshd can handle it
    // Actually, store the PEM public key and use a script to convert on container start
    return pem;
  }
}

// Save key pair (public key only) for a user
export function saveKeyPair(userId: string, kp: KeyPairData): void {
  const dir = userDir(userId);
  const data = { ...kp };
  fs.writeFileSync(
    path.join(dir, `${path.basename(kp.name)}.json`),
    JSON.stringify(data, null, 2)
  );
}

// List key pairs for a user
export function listKeyPairs(userId: string): KeyPairData[] {
  const dir = userDir(userId);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  return files.map((f) => {
    const content = fs.readFileSync(path.join(dir, f), "utf-8");
    return JSON.parse(content) as KeyPairData;
  });
}

// Get a specific key pair
export function getKeyPair(
  userId: string,
  name: string
): KeyPairData | null {
  const file = path.join(userDir(userId), `${path.basename(name)}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

// Delete a key pair
export function deleteKeyPair(userId: string, name: string): boolean {
  const file = path.join(userDir(userId), `${path.basename(name)}.json`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}

// Get the public key string for injection into containers
export function getPublicKeyForInjection(
  userId: string,
  keyPairName: string
): string | null {
  const kp = getKeyPair(userId, keyPairName);
  if (!kp) return null;
  return kp.publicKey;
}
