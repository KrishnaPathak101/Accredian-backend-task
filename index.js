const express = require('express');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://accredian-frontend-task-sooty.vercel.app'],
  credentials: true,
}));

app.use(bodyParser.json());

const referralValidationRules = [
  body('referrerName').notEmpty().withMessage('Referrer name is required'),
  body('referrerEmail').isEmail().withMessage('Referrer email must be a valid email address'),
  body('refereeName').notEmpty().withMessage('Referee name is required'),
  body('refereeEmail').isEmail().withMessage('Referee email must be a valid email address'),
  body('course').notEmpty().withMessage('Course is required'),
];

// Middleware for handling validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({ [err.param]: err.msg }));
    return res.status(400).json({
      errors: extractedErrors,
    });
  }
  next();
};

async function sendEmail(referrerEmail, refereeEmail) {
  try {
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        // Uncomment and configure OAuth2 if needed
        // type: 'OAuth2',
        // clientId: process.env.CLIENT_ID,
        // clientSecret: process.env.CLIENT_SECRET,
        // refreshToken: process.env.REFRESH_TOKEN,
        // accessToken: process.env.ACCESS_TOKEN,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: refereeEmail,
      subject: 'Referral Submission Successful',
      text: `Thank you for referring ${refereeEmail}.`,
      html: `<p>Thank you for referring <strong>${refereeEmail}</strong>.</p>`,
    };

    const result = await transport.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Error sending email');
  }
}

// Create a new referral
app.post('/referrals', referralValidationRules, validate, async (req, res) => {
  const { referrerName, referrerEmail, refereeName, refereeEmail, course } = req.body;

  try {
    const referral = await prisma.referral.create({
      data: {
        referrerName,
        referrerEmail,
        refereeName,
        refereeEmail,
        course,
      },
    });

    await sendEmail(referrerEmail, refereeEmail); // Send email upon successful referral creation
    res.status(201).json(referral);
  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({ error: 'An error occurred while creating the referral.' });
  }
});




// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
