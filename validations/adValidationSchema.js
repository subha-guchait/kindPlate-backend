const Joi = require("joi");

const adValidationSchema = Joi.object({
  content: Joi.string().max(500).allow("").optional().messages({
    "string.base": "Content must be a text.",
    "string.max": "Content can be up to 500 characters long.",
  }),

  mediaUrl: Joi.string().uri().required().messages({
    "string.base": "Media URL must be a string.",
    "string.uri": "Media URL must be a valid URI.",
    "any.required": "Media URL is required.",
  }),

  webUrl: Joi.string().uri().allow("", null).optional().messages({
    "string.base": "Website URL must be a string.",
    "string.uri": "Website URL must be a valid URI.",
  }),

  duration: Joi.number().integer().min(1).required().messages({
    "number.base": "Duration must be a number.",
    "number.min": "Duration must be at least 1 day.",
    "any.required": "Duration is required.",
  }),
});

module.exports = adValidationSchema;
