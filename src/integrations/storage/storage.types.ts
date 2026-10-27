export interface ObjectStorage {
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
