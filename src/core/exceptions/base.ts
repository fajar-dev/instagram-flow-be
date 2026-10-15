import { HTTPException } from "hono/http-exception"
import { ContentfulStatusCode } from "hono/utils/http-status"
import { ZodError } from "zod"

/**
 * Base Application Exception Class
 * Extends Hono's HTTPException for seamless integration.
 */
export class BaseException extends HTTPException {
    public context: unknown

    constructor(
        message: string,
        status: number = 400,
        errors: unknown = null
    ) {
        super(status as ContentfulStatusCode, { message })
        this.context = errors
    }
}

/**
 * Common Exception Sub-classes (Standard HTTP Semantics)
 */
export class BadRequestException extends BaseException {
    constructor(message: string = "Bad Request", errors: unknown = null) {
        super(message, 400, errors)
    }
}

export class UnauthorizedException extends BaseException {
    constructor(message: string = "Unauthorized Access") {
        super(message, 401)
    }
}

export class NotFoundException extends BaseException {
    constructor(message: string = "Resource not found") {
        super(message, 404)
    }
}

export class InternalServerException extends BaseException {
    constructor(message: string = "Internal Server Error") {
        super(message, 500)
    }
}

export class ForbiddenException extends BaseException {
    constructor(message: string = "Forbidden") {
        super(message, 403)
    }
}

export class ConflictException extends BaseException {
    constructor(message: string = "Conflict") {
        super(message, 409)
    }
}

export class TooManyRequestsException extends BaseException {
    constructor(message: string = "Too Many Requests") {
        super(message, 429)
    }
}

export class ValidationException extends BaseException {
    constructor(errors: ZodError) {
        super("Validation failed", 422, errors.issues.map(i => ({
            field: i.path.join("."),
            message: i.message
        })))
    }
}