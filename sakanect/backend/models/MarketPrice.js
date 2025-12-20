const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema({
  date: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  header: {
    date: String,
    department: String,
    title: String
  },
  // Store the complex nested sections as a flexible Object
  sections: { type: Array, required: true },
  created_by: { type: String, default: 'n8n_workflow' }
});

module.exports = mongoose.model('MarketPrice', marketPriceSchema);