const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const serviceSchema = new Schema({
  name: {
    type: String,
    enum: ["premium", "ads"],
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ["time_based", "one_time"],
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  duration: {
    type: Number, // days
    required: function () {
      return this.serviceType === "time_based";
    },
  },
});

module.exports = mongoose.model("Service", serviceSchema);
