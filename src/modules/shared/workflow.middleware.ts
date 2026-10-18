import type { Context, Next } from 'hono';
import { timingSafeEqual } from 'node:crypto';
import { config } from '../../config/config';
import { UnauthorizedException, TooManyRequestsException } from '../../core/exceptions/base';
export const serviceOnly = async (c: Context, next: Next) => {
    const supplied = Buffer.from(c.req.header('Authorization') || '');
    const expected = Buffer.from(`Bearer ${config.n8n.serviceToken}`);
    if (!config.n8n.serviceToken || supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
        throw new UnauthorizedException();
    await next();
};
// Per-process abuse guard; upstream shared rate limiting is required for multi-instance deployment.
const counters = new Map<number, {
    count: number;
    until: number;
}>();
export const workflowMutationLimit = async (c: Context, next: Next) => {
    const now = Date.now();
    for (const [key, entry] of counters)
        if (entry.until < now)
            counters.delete(key);
    const userId = c.get('user').id;
    const entry = counters.get(userId) || { count: 0, until: now + 60000 };
    if (++entry.count > 90)
        throw new TooManyRequestsException();
    counters.set(userId, entry);
    await next();
};
