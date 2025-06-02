import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('ENCRYPTION_KEY');
    const secretIv = this.configService.get<string>('ENCRYPTION_IV');

    if (!secretKey || !secretIv) {
      this.logger.error(
        'ENCRYPTION_KEY or ENCRYPTION_IV is not defined in .env',
      );
      throw new Error('Encryption key/IV not configured.');
    }

    this.key = Buffer.from(secretKey, 'hex');
    this.iv = Buffer.from(secretIv, 'hex');

    if (this.key.length !== 32) {
      console.log(this.key);
      throw new Error(
        'Encryption key must be 32 bytes (e.g., 64 hex characters).',
      );
    }
    if (this.iv.length !== 16) {
      throw new Error(
        'Encryption IV must be 16 bytes (e.g., 32 hex characters).',
      );
    }
  }

  encrypt(text: string): string {
    try {
      const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Encryption process failed.');
    }
  }

  decrypt(encryptedText: string): string {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        this.iv,
      );
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error(
        `Decryption failed for text starting with: ${encryptedText.substring(0, 10)}`,
        error,
      );

      throw new Error(
        'Decryption process failed. The encrypted data may be corrupt or the key/IV incorrect.',
      );
    }
  }
}
