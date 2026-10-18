import type { Context } from 'hono';
import type { User } from '../user/entities/user.entity';
import { resourceId, idempotencyKey } from './validators/shared.validator';
export function actor(c: Context): User { return c.get('user'); }
export function id(c: Context, key: string) { return resourceId.parse(c.req.param(key)); }
export function key(c: Context) { return idempotencyKey.parse(c.req.header('Idempotency-Key')); }
export function binary(data: Buffer, mime: string, download = false) {
    return new Response(new Uint8Array(data), {
        headers: {
            'Content-Type': mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; img-src data:; sandbox", ...(download ? { 'Content-Disposition': 'attachment' } : {})
        }
    });
}
