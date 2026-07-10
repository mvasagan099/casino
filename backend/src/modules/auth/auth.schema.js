/**
 * JSON Schema definitions for auth route validation.
 */

const successMessage = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
  },
};

export const registerSchema = {
  body: {
    type: 'object',
    required: ['email', 'username', 'password', 'phoneNumber', 'countryCode'],
    properties: {
      email: { type: 'string', format: 'email', maxLength: 255 },
      username: { type: 'string', minLength: 3, maxLength: 20, pattern: '^[a-zA-Z0-9_]+$' },
      password: { type: 'string', minLength: 8, maxLength: 128 },
      phoneNumber: { type: 'string' },
      countryCode: { type: 'string' },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                username: { type: 'string' },
                role: { type: 'string' },
                savedGames: { type: 'array', items: { type: 'integer' } },
                phoneNumber: { type: ['string', 'null'] },
                countryCode: { type: ['string', 'null'] },
              },
            },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
  },
};

export const loginSchema = {
  body: {
    type: 'object',
    required: ['login', 'password'],
    properties: {
      login: { type: 'string', minLength: 1, description: 'Email or username' },
      password: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                username: { type: 'string' },
                role: { type: 'string' },
                savedGames: { type: 'array', items: { type: 'integer' } },
                phoneNumber: { type: ['string', 'null'] },
                countryCode: { type: ['string', 'null'] },
              },
            },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
  },
};

export const refreshSchema = {
  body: {
    type: 'object',
    required: ['refreshToken'],
    properties: { refreshToken: { type: 'string' } },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
  },
};

export const logoutSchema = {
  body: {
    type: 'object',
    required: ['refreshToken'],
    properties: { refreshToken: { type: 'string' } },
    additionalProperties: false,
  },
  response: { 200: successMessage },
};

export const meSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            role: { type: 'string' },
            isVerified: { type: 'boolean' },
            avatarUrl: { type: ['string', 'null'] },
            createdAt: { type: 'string' },
            savedGames: { type: 'array', items: { type: 'integer' } },
            phoneNumber: { type: ['string', 'null'] },
            countryCode: { type: ['string', 'null'] },
          },
        },
      },
    },
  },
};

export const forgotPasswordSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: { email: { type: 'string', format: 'email' } },
    additionalProperties: false,
  },
  response: { 200: successMessage },
};

export const resetPasswordSchema = {
  body: {
    type: 'object',
    required: ['token', 'newPassword'],
    properties: {
      token: { type: 'string' },
      newPassword: { type: 'string', minLength: 8, maxLength: 128 },
    },
    additionalProperties: false,
  },
  response: { 200: successMessage },
};

export const verifyEmailSchema = {
  querystring: {
    type: 'object',
    required: ['token'],
    properties: { token: { type: 'string' } },
  },
  response: { 200: successMessage },
};

export const updateSavedGamesSchema = {
  body: {
    type: 'object',
    required: ['savedGames'],
    properties: {
      savedGames: {
        type: 'array',
        items: { type: 'integer' },
      },
    },
    additionalProperties: false,
  },
};

export const updateProfileSchema = {
  body: {
    type: 'object',
    required: ['phoneNumber', 'countryCode'],
    properties: {
      phoneNumber: { type: 'string' },
      countryCode: { type: 'string' },
    },
    additionalProperties: false,
  },
};
