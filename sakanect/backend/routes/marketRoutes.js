const express = require('express');
const router = express.Router();
const MarketPrice = require('../models/MarketPrice');

// 1. CREATE/UPDATE: Save Daily Price Index (Upsert)
router.post('/', async (req, res) => {
  try {
    console.log("📥 Receiving Market Data for:", req.body.date);
    
    // Find a document with the same 'date'. If found, update it. If not, create it.
    const savedEntry = await MarketPrice.findOneAndUpdate(
      { date: req.body.date }, 
      req.body,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    console.log("✅ Saved/Updated successfully!");
    res.status(201).json(savedEntry);
  } catch (error) {
    console.error("❌ Save Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. READ LATEST: Get the most recent price list
router.get('/latest', async (req, res) => {
  try {
    const latest = await MarketPrice.findOne().sort({ timestamp: -1 });
    res.json(latest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. READ HISTORY: Get price trends for a specific crop (e.g., 'Onion')
router.get('/history/:cropName', async (req, res) => {
  try {
    const { cropName } = req.params;
    const cleanName = cropName.toLowerCase();

    // Fetch last 30 daily reports, sorted by date
    const allReports = await MarketPrice.find().sort({ date: 1 }).limit(30);

    const history = [];

    // Loop through every daily report to extract the price for THIS crop
    allReports.forEach(report => {
        let foundPrice = null;
        
        // Navigate the nested structure: sections -> subsections -> items
        if (report.sections) {
            for (const section of report.sections) {
                if (!section.subsections) continue;
                
                for (const sub of section.subsections) {
                    if (!sub.items) continue;
                    
                    for (const item of sub.items) {
                        // Check if commodity name matches (e.g., "Red Onion" includes "onion")
                        if (item.commodity && item.commodity.toLowerCase().includes(cleanName)) {
                            foundPrice = item.price;
                            break; 
                        }
                    }
                    if (foundPrice) break;
                }
                if (foundPrice) break;
            }
        }

        // Only add to history if we found a valid price
        if (foundPrice) {
            history.push({
                date: report.date, // e.g., "December 8, 2025"
                price: foundPrice
            });
        }
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. READ ALL: Get all raw reports (For debugging/admin)
router.get('/', async (req, res) => {
  try {
    const allPrices = await MarketPrice.find().sort({ date: -1 });
    res.json(allPrices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;