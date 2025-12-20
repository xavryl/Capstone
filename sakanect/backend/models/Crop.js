const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  sellerId: { type: String, required: true },
  sellerName: { type: String, required: true },

  title: { type: String, required: true, trim: true },
  description: { type: String },
  category: { type: String, default: 'Vegetable' },
  type: { type: String, enum: ['For Sale', 'Barter', 'Donation'], default: 'For Sale' },
  
  quantity_kg: { type: Number, required: true, min: 0 },
  price_per_kg: { type: Number, default: 0 },

  location: { type: String, required: true },
  
  // FIX: Change to GeoJSON format
  coordinates: {
    type: {
      type: String, 
      enum: ['Point'], 
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number], // Array of numbers: [longitude, latitude]
      required: true
    }
  },

  imageUrl: { type: String },
  status: { type: String, default: 'available' },
  createdAt: { type: Date, default: Date.now }
});

// Index the 'coordinates' field for "Near Me" searches
cropSchema.index({ coordinates: '2dsphere' });

module.exports = mongoose.model('Crop', cropSchema);