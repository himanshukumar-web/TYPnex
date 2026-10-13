import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface StorageUploadOptions {
  storageKey: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export interface StorageProvider {
  upload(options: StorageUploadOptions): Promise<{ storageKey: string }>;
  download(storageKey: string): Promise<Buffer>;
  createSignedUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;
  delete(storageKey: string): Promise<boolean>;
}

const STORAGE_SECRET =
  process.env.SESSION_SECRET ||
  process.env.JWT_SECRET ||
  "typnex-private-storage-key-secret-2026";

/**
 * Private local disk storage provider.
 * Keeps files in private directory OUTSIDE the public web root.
 */
export class PrivateDiskStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), "storage", "private");
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  private getFilePath(storageKey: string): string {
    // Sanitize storageKey to prevent path traversal
    const safeKey = path.basename(storageKey);
    return path.join(this.baseDir, safeKey);
  }

  async upload(options: StorageUploadOptions): Promise<{ storageKey: string }> {
    await this.ensureDir();
    const filePath = this.getFilePath(options.storageKey);
    await fs.writeFile(filePath, options.buffer);
    return { storageKey: options.storageKey };
  }

  async download(storageKey: string): Promise<Buffer> {
    const filePath = this.getFilePath(storageKey);
    return await fs.readFile(filePath);
  }

  async createSignedUrl(storageKey: string, expiresInSeconds: number = 300): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const dataToSign = `${storageKey}:${expiresAt}`;
    const token = crypto
      .createHmac("sha256", STORAGE_SECRET)
      .update(dataToSign)
      .digest("hex");

    return `/api/files/download/${encodeURIComponent(storageKey)}?token=${token}&expires=${expiresAt}`;
  }

  async delete(storageKey: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(storageKey);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  verifySignedToken(storageKey: string, token: string, expiresAt: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    if (now > expiresAt) {
      return false; // Expired
    }
    const dataToSign = `${storageKey}:${expiresAt}`;
    const expected = crypto
      .createHmac("sha256", STORAGE_SECRET)
      .update(dataToSign)
      .digest("hex");

    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expected);
    if (tokenBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(tokenBuf, expectedBuf);
  }
}

/**
 * Supabase Storage provider for production private bucket 'typnex-files'.
 */
export class SupabaseStorageProvider implements StorageProvider {
  private client: SupabaseClient;
  private bucket: string;

  constructor() {
    const url = process.env.SUPABASE_URL || "";
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "";
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || "typnex-files";
    this.client = createClient(url, key);
  }

  async upload(options: StorageUploadOptions): Promise<{ storageKey: string }> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(options.storageKey, options.buffer, {
        contentType: options.mimeType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase storage upload failed: ${error.message}`);
    }

    return { storageKey: options.storageKey };
  }

  async download(storageKey: string): Promise<Buffer> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(storageKey);

    if (error || !data) {
      throw new Error(`Supabase storage download failed: ${error?.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async createSignedUrl(storageKey: string, expiresInSeconds: number = 300): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Supabase signed URL creation failed: ${error?.message}`);
    }

    return data.signedUrl;
  }

  async delete(storageKey: string): Promise<boolean> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([storageKey]);

    return !error;
  }
}

function getActiveProvider(): StorageProvider {
  if (
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  ) {
    return new SupabaseStorageProvider();
  }
  return new PrivateDiskStorageProvider();
}

export const storageService = getActiveProvider();
