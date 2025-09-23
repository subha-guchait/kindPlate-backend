const Joi = require("joi");

const passwordValidation = Joi.string()
  .pattern(/^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/)
  .required()
  .messages({
    "string.pattern.base":
      "Password must be at least 8 characters long and include one uppercase letter and one special character.",
    "string.empty": "Password is required.",
  });

module.exports = passwordValidation;
