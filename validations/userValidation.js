const Joi = require("joi");

const userValidationSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .custom(capitalizeFirstLetter)
    .required()
    .messages({
      "string.empty": "First name is required.",
      "string.min": "First name must be at least 2 characters.",
      "string.max": "First name must not exceed 50 characters.",
    }),

  lastName: Joi.string()
    .min(2)
    .max(50)
    .custom(capitalizeFirstLetter)
    .required()
    .messages({
      "string.empty": "Last name is required.",
      "string.min": "Last name must be at least 2 characters.",
      "string.max": "Last name must not exceed 50 characters.",
    }),

  email: Joi.string().email().required().messages({
    "string.empty": "Email is required.",
    "string.email": "Email must be a valid email address.",
  }),

  phone: Joi.string()
    .pattern(/^[6-9][0-9]{9}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Phone number must be a valid 10-digit Indian mobile number starting with 6-9.",
      "string.empty": "Phone number is required.",
    }),

  password: Joi.string()
    .pattern(/^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must be at least 8 characters long and include one uppercase letter and one special character.",
      "string.empty": "Password is required.",
    }),

  userType: Joi.string()
    .valid(
      "individual",
      "ngo",
      "oldage",
      "orphanage",
      "shelter",
      "communityKitchen"
    )
    .default("individual")
    .messages({
      "any.only": "Invalid user type.",
    }),

  isAccepted: Joi.boolean().valid(true).required().messages({
    "any.only": "You must accept the terms to register.",
    "any.required": "Acceptance of terms is required.",
  }),
});

// Capitalization and validation for name fields
function capitalizeFirstLetter(value, helpers) {
  if (!/^[a-zA-Z]+$/.test(value)) {
    return helpers.message("Name must contain only letters.");
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

module.exports = userValidationSchema;
