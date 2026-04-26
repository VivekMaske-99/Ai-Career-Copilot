const mongoose = require("mongoose");

const aiResultSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    default: "processing"
  },
  aiFeedback: {
    type: String,
    default: ""
  }
}, { timestamps: true });

module.exports = mongoose.model("AIResult", aiResultSchema);