const Joi = require("joi");
const passwordValidation = require("./passwordValidation");

const changePasswordValidation = Joi.object({
  oldPassword: Joi.string().required().messages({
    "string.empty": "Old password is required.",
  }),
  newPassword: passwordValidation,
});

module.exports = changePasswordValidation;
