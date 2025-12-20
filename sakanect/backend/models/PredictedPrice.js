const mongoose = require('mongoose');

const PredictedPriceSchema = new mongoose.Schema({
  crop: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  current_price: {
    type: Number,
    required: true
  },
  predicted_price: {
    type: Number,
    required: true
  },
  trend: {
    type: String,
    enum: ['UP', 'DOWN', 'STABLE'],
    required: true
  },
  reason: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PredictedPrice', PredictedPriceSchema);