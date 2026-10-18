import { createHash } from 'node:crypto';
export const contentHash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const id = () => crypto.randomUUID();
