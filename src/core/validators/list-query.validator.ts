import { z } from 'zod';

export const listQuerySchema = z.object({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    q: z.string().max(150).default(''),
    sortBy: z.string().max(64).optional(),
    order: z.string().transform(value => value.toUpperCase()).pipe(z.enum(['ASC', 'DESC'])).default('DESC'),
});
