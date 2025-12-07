import { Injectable } from '@nestjs/common';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

@Injectable()
export class CompressionService {
  /**
   * Compress data using gzip
   */
  async compress(data: any): Promise<Buffer> {
    const jsonString = JSON.stringify(data);
    return await gzip(Buffer.from(jsonString));
  }

  /**
   * Decompress data using gunzip
   */
  async decompress(buffer: Buffer): Promise<any> {
    const decompressed = await gunzip(buffer);
    const jsonString = decompressed.toString('utf-8');
    return JSON.parse(jsonString);
  }

  /**
   * Compress and encode to base64 for storage
   */
  async compressToBase64(data: any): Promise<string> {
    const compressed = await this.compress(data);
    return compressed.toString('base64');
  }

  /**
   * Decompress from base64 string
   */
  async decompressFromBase64(base64: string): Promise<any> {
    const buffer = Buffer.from(base64, 'base64');
    return await this.decompress(buffer);
  }
}

