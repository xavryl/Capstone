const express = require('express');
const router = express.Router();
const PredictedPrice = require('../models/PredictedPrice'); 

// GET: Fetch the latest predictions (For the Dashboard)
router.get('/latest', async (req, res) => {
  try {
    // Get predictions from the last 24 hours only
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const latestPredictions = await PredictedPrice.find({
      timestamp: { $gte: oneDayAgo }
    }).sort({ predicted_price: -1 });

    res.json(latestPredictions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Save new predictions (Used by n8n)
router.post('/', async (req, res) => {
  try {
    const newPrediction = new PredictedPrice(req.body);
    await newPrediction.save();
    res.status(201).json(newPrediction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;