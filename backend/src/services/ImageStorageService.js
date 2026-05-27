import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsBase = path.join(__dirname, '../../uploads');

const variants = [
  { name: 'thumb', width: 420, quality: 72 },
  { name: 'medium', width: 1200, quality: 78 },
  { name: 'large', width: 2000, quality: 82 },
];

export default class ImageStorageService {
  static async storePhoto(file) {
    const id = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;
    const optimized = await this.#createVariants(file);

    const stored = {};
    for (const variant of optimized) {
      stored[variant.name] = await this.#storeBuffer({
        buffer: variant.buffer,
        key: `photos/${id}-${variant.name}.${variant.ext}`,
        contentType: variant.contentType,
      });
    }

    return {
      storage_key: `photos/${id}`,
      image_url: stored.original,
      image_thumb_url: stored.thumb || stored.original,
      image_medium_url: stored.medium || stored.original,
      image_large_url: stored.large || stored.original,
    };
  }

  static async #createVariants(file) {
    const fallbackExt = this.#extensionFor(file);
    const original = {
      name: 'original',
      buffer: file.buffer,
      ext: fallbackExt,
      contentType: file.mimetype || `image/${fallbackExt}`,
    };

    try {
      const sharp = (await import('sharp')).default;
      const source = sharp(file.buffer, { animated: false }).rotate();
      const metadata = await source.metadata();
      const originalFormat = metadata.format === 'png' ? 'png' : 'jpeg';

      const output = [{
        name: 'original',
        buffer: await source.clone().toFormat(originalFormat, { quality: 88 }).toBuffer(),
        ext: originalFormat === 'jpeg' ? 'jpg' : 'png',
        contentType: originalFormat === 'jpeg' ? 'image/jpeg' : 'image/png',
      }];

      for (const variant of variants) {
        output.push({
          name: variant.name,
          buffer: await source
            .clone()
            .resize({ width: variant.width, withoutEnlargement: true })
            .webp({ quality: variant.quality })
            .toBuffer(),
          ext: 'webp',
          contentType: 'image/webp',
        });
      }

      return output;
    } catch {
      return [
        original,
        ...variants.map(variant => ({ ...original, name: variant.name })),
      ];
    }
  }

  static #extensionFor(file) {
    const ext = path.extname(file.originalname || '').replace('.', '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
    if (file.mimetype === 'image/png') return 'png';
    if (file.mimetype === 'image/webp') return 'webp';
    if (file.mimetype === 'image/gif') return 'gif';
    return 'jpg';
  }

  static async #storeBuffer({ buffer, key, contentType }) {
    if (process.env.STORAGE_DRIVER === 's3') {
      return this.#storeS3({ buffer, key, contentType });
    }
    return this.#storeLocal({ buffer, key });
  }

  static async #storeLocal({ buffer, key }) {
    const filePath = path.join(uploadsBase, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return `/uploads/${key}`;
  }

  static async #storeS3({ buffer, key, contentType }) {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });

    await client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    return `${process.env.CDN_BASE_URL || process.env.S3_PUBLIC_BASE_URL}/${key}`;
  }
}
