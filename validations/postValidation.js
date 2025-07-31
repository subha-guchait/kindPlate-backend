const Joi = require("joi");

const foodPostValidationSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    "string.base": "Title must be a text.",
    "string.empty": "Title is required.",
    "string.min": "Title must be at least 3 characters long.",
    "string.max": "Title must be less than or equal to 100 characters.",
    "any.required": "Title is required.",
  }),

  description: Joi.string().max(500).allow("").default(null).messages({
    "string.base": "Description must be a text.",
    "string.max": "Description can be up to 500 characters long.",
  }),

  servings: Joi.number().min(1).required().messages({
    "number.base": "Servings must be a number.",
    "number.min": "Servings must be at least 1.",
    "any.required": "Servings is required.",
  }),

  expiryTime: Joi.date().greater("now").required().messages({
    "date.base": "Expiry time must be a valid date.",
    "date.greater": "Expiry time must be in the future.",
    "any.required": "Expiry time is required.",
  }),

  location: Joi.object({
    street: Joi.string().required().messages({
      "string.base": "Street must be a text.",
      "string.empty": "Street is required.",
      "any.required": "Street is required.",
    }),
    state: Joi.string().required().messages({
      "string.base": "State must be a text.",
      "string.empty": "State is required.",
      "any.required": "State is required.",
    }),
    city: Joi.string().required().messages({
      "string.base": "City must be a text.",
      "string.empty": "City is required.",
      "any.required": "City is required.",
    }),
  })
    .required()
    .messages({
      "object.base": "Location must be a valid object with state and city.",
      "any.required": "Location is required.",
    }),

  mediaUrl: Joi.string().uri().allow(null, "").optional().messages({
    "string.base": " joi Media URL must be a string.",
    "string.uri": "Media URL must be a valid URI.",
  }),
});

module.exports = foodPostValidationSchema;
