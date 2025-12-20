require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');


// --- 1. IMPORT ROUTES (Ensure casing matches folder name 'routes') ---
const cropRoutes = require('./routes/cropRoutes');
const marketRoutes = require('./routes/marketRoutes'); 
const predictedPriceRoutes = require('./routes/predictedPriceRoutes'); 
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// --- 2. MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 3. DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// --- 4. USE ROUTES ---
app.use('/api/crops', cropRoutes);
app.use('/api/market-prices', marketRoutes);
app.use('/api/predictedPrices', predictedPriceRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.send('SakaNect API is Running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// TEMPORARY TEST - Delete after verifying
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // <--- ADD THIS LINE to bypass the error
  }
});

transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Email Connection Failed:', error);
  } else {
    console.log('✅ Server is ready to send emails!');
  }
});

