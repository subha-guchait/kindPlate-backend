const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const forgotPasswordRequestSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  isActive: {
    type: Boolean,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
});

module.exports = mongoose.model(
  "ForgotPasswordRequest",
  forgotPasswordRequestSchema
);
