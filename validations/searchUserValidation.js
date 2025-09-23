const Joi = require("joi");

const searchUserValidationSchema = Joi.object({
  query: Joi.alternatives()
    .try(
      Joi.string().email().trim(),
      Joi.string()
        .pattern(/^\d{10}$/)
        .trim()
    )
    .required()
    .messages({
      "any.required": "Query is required.",
      "alternatives.match":
        "Query must be a valid email or a 10-digit mobile number.",
    }),
});

module.exports = searchUserValidationSchema;
