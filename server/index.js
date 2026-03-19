require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const axios   = require('axios');

const app  = express();
const PORT = process.env.PORT || 3000;

// ---- CORS ----
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || origin.includes('github.io') || origin === process.env.ALLOWED_ORIGIN) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

// ---- Daraja Config ----
const DARAJA_BASE = process.env.MPESA_ENV === 'live'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

const SHORTCODE = process.env.MPESA_SHORTCODE  || '174379';
const PASSKEY   = process.env.MPESA_PASSKEY    || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const CALLBACK  = process.env.MPESA_CALLBACK_URL || 'https://dadris-payment-server.onrender.com/mpesa/callback';

// ---- Firebase REST API (no Admin SDK needed) ----
const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT_ID || 'dadris-designers';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY; // Web API key from Firebase project settings

async function firestoreUpdate(projectId, amountPaid, mpesaRef) {
  try {
    // Get current project data
    const getUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/projects/${projectId}?key=${FIREBASE_API_KEY}`;
    const getRes = await axios.get(getUrl);
    const fields = getRes.data.fields || {};

    const currentPaid = parseFloat(fields.paid?.doubleValue || fields.paid?.integerValue || 0);
    const total       = parseFloat(fields.amount?.doubleValue || fields.amount?.integerValue || 0);
    const newPaid     = currentPaid + parseFloat(amountPaid || 0);
    const isPaid      = newPaid >= total;

    // Patch the project
    const patchUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/projects/${projectId}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=paid&updateMask.fieldPaths=paymentStatus&updateMask.fieldPaths=lastMpesaRef`;
    await axios.patch(patchUrl, {
      fields: {
        paid:          { doubleValue: newPaid },
        paymentStatus: { stringValue: isPaid ? 'paid' : 'partial' },
        lastMpesaRef:  { stringValue: mpesaRef || '' },
      }
    });

    console.log(`[Firebase] ✅ Project ${projectId} updated — paid: ${newPaid}`);
    return true;
  } catch (e) {
    console.error('[Firebase] Update failed:', e.response?.data?.error?.message || e.message);
    return false;
  }
}

// ---- Simple in-memory payment store (for status polling) ----
const payments = new Map();

// ---- Daraja Helpers ----
async function getDarajaToken() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const res  = await axios.get(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  return res.data.access_token;
}

function getTimestampAndPassword() {
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const password  = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');
  return { timestamp, password };
}

function formatPhone(phone) {
  phone = phone.replace(/\s/g, '');
  if (phone.startsWith('0'))    return '254' + phone.slice(1);
  if (phone.startsWith('+254')) return phone.slice(1);
  if (phone.startsWith('254'))  return phone;
  return '254' + phone;
}

// ---- Routes ----
app.get('/', (req, res) => {
  res.json({ status: 'Dadris Payment Server ✅', env: process.env.MPESA_ENV || 'sandbox' });
});

app.get('/test', async (req, res) => {
  try {
    const token = await getDarajaToken();
    res.json({ success: true, token: token.slice(0,20) + '...', env: DARAJA_BASE, shortcode: SHORTCODE });
  } catch (err) {
    res.json({ success: false, error: err.response?.data || err.message });
  }
});

// ---- STK Push ----
app.post('/mpesa/pay', async (req, res) => {
  const { projectId, clientId, clientName, clientPhone, amount } = req.body;
  if (!projectId || !amount || !clientPhone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const phone = formatPhone(clientPhone);
  const amt   = Math.ceil(parseFloat(amount));
  if (amt < 1) return res.status(400).json({ error: 'Amount must be at least KSh 1' });

  try {
    const token = await getDarajaToken();
    const { timestamp, password } = getTimestampAndPassword();

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   'CustomerPayBillOnline',
      Amount:            amt,
      PartyA:            phone,
      PartyB:            SHORTCODE,
      PhoneNumber:       phone,
      CallBackURL:       CALLBACK,
      AccountReference:  'DadrisDesigners',
      TransactionDesc:   'Design Services Payment',
    };

    const response = await axios.post(
      `${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { CheckoutRequestID, ResponseCode, CustomerMessage } = response.data;
    console.log('[Daraja] STK Response:', JSON.stringify(response.data));

    if (ResponseCode === '0') {
      // Store in memory for polling
      payments.set(CheckoutRequestID, { projectId, clientId, amount: amt, status: 'PENDING' });
      console.log(`[Daraja] STK Push sent to ${phone} KSh ${amt}`);
      res.json({ success: true, checkoutRequestId: CheckoutRequestID, message: CustomerMessage || 'Check your phone and enter M-Pesa PIN.' });
    } else {
      res.status(400).json({ error: response.data.ResponseDescription || 'STK Push failed' });
    }
  } catch (err) {
    console.error('[Daraja] Pay error:', JSON.stringify(err.response?.data || err.message));
    res.status(500).json({ error: 'Payment initiation failed. Please try again.' });
  }
});

// ---- M-Pesa Callback ----
app.post('/mpesa/callback', async (req, res) => {
  try {
    const body     = req.body?.Body?.stkCallback;
    const code     = body?.ResultCode;
    const checkId  = body?.CheckoutRequestID;
    const amount   = body?.CallbackMetadata?.Item?.find(i => i.Name === 'Amount')?.Value;
    const mpesaRef = body?.CallbackMetadata?.Item?.find(i => i.Name === 'MpesaReceiptNumber')?.Value;

    console.log(`[Daraja] Callback — CheckoutID: ${checkId}, Code: ${code}, Amount: ${amount}, Ref: ${mpesaRef}`);

    if (code === 0 && checkId) {
      const payment = payments.get(checkId);
      if (payment) {
        payments.set(checkId, { ...payment, status: 'COMPLETED', mpesaRef });
        // Update Firebase via REST
        await firestoreUpdate(payment.projectId, amount, mpesaRef);
      }
    } else {
      if (checkId && payments.has(checkId)) {
        const payment = payments.get(checkId);
        payments.set(checkId, { ...payment, status: 'FAILED' });
      }
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('[Daraja] Callback error:', err.message);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// ---- Poll Payment Status ----
app.get('/mpesa/status/:checkoutRequestId', (req, res) => {
  const payment = payments.get(req.params.checkoutRequestId);
  if (!payment) return res.json({ status: 'PENDING' });
  res.json({ status: payment.status, mpesaRef: payment.mpesaRef || '' });
});

app.listen(PORT, () => {
  console.log(`[Dadris] Payment server running on port ${PORT} (${process.env.MPESA_ENV || 'sandbox'})`);
});
