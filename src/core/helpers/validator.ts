import { ValidationException } from "../exceptions/base"
import type { ZodError } from "zod"

/**
 * Standard Zod validation hook for Hono/zValidator.
 * Automatically throws a ValidationException if validation fails.
 */
export const validationHook = (
    result: { success: true } | { success: false; error: Pick<ZodError, "issues"> }
) => {
    if (!result.success) {
        throw new ValidationException(result.error)
    }
}
