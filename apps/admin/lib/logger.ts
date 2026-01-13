import pino from 'pino'

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',

    redact: {
        paths: [
            'userId',
            'email',
            'password',
            'token',
            'apiKey',
            'secret',
            'creditCard',
            '*.userId',
            '*.email',
            '*.password',
            '*.token'
        ],
        remove: true
    },

    transport: process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname'
            }
        }
        : undefined,

    base: {
        env: process.env.NODE_ENV
    }
})