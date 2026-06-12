import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().optional(),
    DB_HOST: Joi.string().when('DATABASE_URL', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required(),
    }),
    DB_PORT: Joi.number().default(5432),
    DB_USERNAME: Joi.string().when('DATABASE_URL', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required(),
    }),
    DB_PASSWORD: Joi.string().when('DATABASE_URL', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required(),
    }),
    DB_NAME: Joi.string().when('DATABASE_URL', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required(),
    }),
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
    CORS_ORIGIN: Joi.string().default('*'),
}).or('DATABASE_URL', 'DB_HOST');
