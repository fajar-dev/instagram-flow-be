import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { AppDataSource } from './config/database'
import { registerRoutes } from './routes/api'
import { ApiResponse } from './core/helpers/response'
import { BaseException, ValidationException } from './core/exceptions/base'
import { ZodError } from 'zod'
import { config } from './config/config'
import { logger } from './core/helpers/logger'
import { requestLogger } from './core/middlewares/logger.middleware'
import { languageMiddleware } from './core/middlewares/language.middleware'

const app = new Hono()

// Request Logger
app.use('*', requestLogger)

// CORS
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))

// Language Detection (Accept-Language header)
app.use('*', languageMiddleware)

// Database Connection
AppDataSource.initialize()
    .then(() => logger.info('Database connected successfully'))
    .catch((err) => logger.error('Database connection failed', { err }))

// Application endpoints are declared in routes/api.ts
registerRoutes(app)

// Global Error Handler
app.onError((err, c) => {
    const context = { requestId: c.get('requestId'), method: c.req.method, path: c.req.path }

    if (err instanceof ZodError) {
        const valErr = new ValidationException(err)
        logger.warn('Validation error', { ...context, statusCode: valErr.status, err: valErr })
        return ApiResponse.error(c, valErr.message, valErr.status, valErr.context)
    }

    if (err instanceof BaseException) {
        logger.warn('Handled exception', { ...context, statusCode: err.status, err })
        return ApiResponse.error(c, err.message, err.status, err.context)
    }

    logger.error('Unhandled exception', { ...context, statusCode: 500, err })

    const errors = config.app.isProduction ? null : {
        message: err.message,
        stack: err.stack
    }

    return ApiResponse.error(c, "Internal Server Error", 500, errors)
})

export default {
  port: config.app.port,
  fetch: app.fetch,
};
