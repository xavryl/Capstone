const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Configure your email service
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: 'sakanect@gmail.com', 
    pass: 'sqxbyzqxevivjeuv'     
  },
  // Fix for "self-signed certificate" error
  tls: {
    rejectUnauthorized: false
  }
});

// POST /api/notifications/email
router.post('/email', async (req, res) => {
  // We now accept 'image' and 'link' (optional) from the frontend
  const { to, subject, text, image, link } = req.body;

  // Use the provided link or default to the dashboard
  const actionLink = link || "https://sakanect.com/dashboard";
  
  // Use provided image or a default SakaNect banner
  // You can replace the default URL below with your actual hosted logo
  const headerImage = image || "https://placehold.co/600x200/16a34a/ffffff?text=SakaNect+Update";

  // --- PROFESSIONAL HTML TEMPLATE ---
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f0fdf4; margin: 0; padding: 20px; }
        .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #dcfce7; }
        
        /* Header Image Area */
        .image-container { width: 100%; height: 200px; background-color: #f9fafb; text-align: center; overflow: hidden; }
        .image-container img { width: 100%; height: 100%; object-fit: cover; }

        /* Branding Header */
        .header { background-color: #16a34a; padding: 15px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 1px; font-weight: bold; }

        /* Content Area */
        .content { padding: 30px; color: #374151; line-height: 1.6; }
        .content h2 { color: #166534; font-size: 22px; margin-top: 0; margin-bottom: 15px; }
        .content p { margin-bottom: 20px; font-size: 16px; }

        /* Centered Button Styling */
        .button-container { text-align: center; margin-top: 30px; margin-bottom: 20px; }
        .btn { 
          background-color: #16a34a; /* Green Background */
          color: #ffffff !important; /* White Text */
          padding: 14px 28px; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: bold; 
          font-size: 16px; 
          display: inline-block; 
          box-shadow: 0 4px 6px rgba(22, 163, 74, 0.3);
          transition: background-color 0.3s ease;
        }
        .btn:hover { background-color: #15803d; }

        /* Footer */
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        
        <div class="image-container">
          <img src="${headerImage}" alt="SakaNect Update" />
        </div>

        <div class="header">
          <h1>🌱 SakaNect Notification</h1> 
        </div>
        
        <div class="content">
          <h2>${subject}</h2>
          
          <p>${text.replace(/\n/g, '<br>')}</p>
          
          <div class="button-container">
            <a href="${actionLink}" class="btn">View Dashboard</a>
          </div>
        </div>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} SakaNect. Helping Farmers Grow.</p>
          <p>This is an automated message. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: '"SakaNect Support" <sakanect@gmail.com>',
    to: to,
    subject: subject,
    text: text, 
    html: htmlTemplate
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
});

module.exports = router;