import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

/**
 * Authenticated symmetric encryption for sensitive secrets (e.g. AdminPulse
 * API keys). Uses AES-256-GCM. The encryption key comes from the
 * ENCRYPTION_KEY env var — 64 hex chars (32 bytes).
 *
 * Format on disk: base64(iv || ciphertext || authTag)
 *
 * Anyone with the key can decrypt; lose the key and nothing comes back.
 */
@Injectable()
export class CryptoService {
  readonly #logger = new Logger(CryptoService.name);
  readonly #key: Buffer;

  constructor(config: ConfigService) {
    const hex = config.getOrThrow<string>('ENCRYPTION_KEY');
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
      throw new Error(
        'ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with `openssl rand -hex 32`.',
      );
    }
    this.#key = Buffer.from(hex, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.#key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, ciphertext, authTag]).toString('base64');
  }

  decrypt(payload: string): string {
    let buffer: Buffer;
    try {
      buffer = Buffer.from(payload, 'base64');
    } catch {
      throw new Error('Encrypted payload is not valid base64.');
    }
    if (buffer.length < IV_BYTES + AUTH_TAG_BYTES) {
      throw new Error('Encrypted payload is truncated.');
    }
    const iv = buffer.subarray(0, IV_BYTES);
    const authTag = buffer.subarray(buffer.length - AUTH_TAG_BYTES);
    const ciphertext = buffer.subarray(
      IV_BYTES,
      buffer.length - AUTH_TAG_BYTES,
    );
    const decipher = createDecipheriv(ALGORITHM, this.#key, iv);
    decipher.setAuthTag(authTag);
    try {
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return plaintext.toString('utf8');
    } catch (err) {
      this.#logger.error(
        'Decryption failed — wrong key or tampered ciphertext',
      );
      throw err;
    }
  }

  /**
   * Constant-time equality for sensitive comparisons (e.g. revealing if
   * two keys match without timing leaks). Returns false if lengths differ.
   */
  safeEquals(a: string, b: string): boolean {
    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  }
}
