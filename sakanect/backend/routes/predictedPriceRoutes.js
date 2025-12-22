const express = require('express');
const router = express.Router();
const PredictedPrice = require('../models/PredictedPrice'); 

// GET: Fetch the absolute latest prediction for EACH crop
router.get('/latest', async (req, res) => {
  try {
    const latestPredictions = await PredictedPrice.aggregate([
      // 1. Sort ALL documents by date (newest first)
      { $sort: { timestamp: -1 } },
      
      // 2. Group by the 'crop' name (e.g., "Basmati Rice")
      // This automatically grabs the first one it sees (which is the newest due to the sort)
      {
        $group: {
          _id: "$crop", 
          latestData: { $first: "$$ROOT" } 
        }
      },
      
      // 3. Clean up the result so it looks like a nice list of objects
      { $replaceRoot: { newRoot: "$latestData" } },
      
      // 4. (Optional) Sort alphabetically A-Z
      { $sort: { crop: 1 } }
    ]);

    // Debugging: Log what we found to the terminal
    console.log(`✅ /latest found ${latestPredictions.length} predictions.`);

    if (latestPredictions.length === 0) {
      return res.json([]); 
    }

    res.json(latestPredictions);
  } catch (error) {
    console.error("❌ Error in /latest route:", error);
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