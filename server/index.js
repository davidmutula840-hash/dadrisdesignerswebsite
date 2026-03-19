require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const admin   = require('firebase-admin');

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

// ---- Firebase Admin Init ----
if (!admin.apps.length) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  privateKey = privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey;
  privateKey = privateKey.replace(/^"|"$/g, '');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  privateKey,
    }),
  });
}
const db = admin.firestore();

// ---- Daraja Config ----
const DARAJA_BASE = process.env.MPESA_ENV === 'live'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

const SHORTCODE = process.env.MPESA_SHORTCODE || '174379';
const PASSKEY   = process.env.MPESA_PASSKEY   || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const CALLBACK  = process.env.MPESA_CALLBACK_URL || 'https://dadris-payment-server.onrender.com/mpesa/callback';

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

// ---- Health Check ----
app.get('/', (req, res) => {
  res.json({ status: 'Dadris Payment Server running', env: process.env.MPESA_ENV || 'sandbox' });
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
      AccountReference:  `DADRIS-${projectId}`,
      TransactionDesc:   `Payment for Dadris Designers`,
    };

    const response = await axios.post(`${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const { CheckoutRequestID, ResponseCode, CustomerMessage } = response.data;

    if (ResponseCode === '0') {
      await db.collection('payments').add({
        projectId, clientId, clientName: clientName || '', phone, amount: amt,
        checkoutRequestId: CheckoutRequestID, status: 'PENDING',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[Daraja] STK Push sent to ${phone} KSh ${amt}`);
      res.json({ success: true, checkoutRequestId: CheckoutRequestID, message: CustomerMessage || 'Check your phone and enter M-Pesa PIN.' });
    } else {
      res.status(400).json({ error: response.data.ResponseDescription || 'STK Push failed' });
    }
  } catch (err) {
    console.error('[Daraja] Pay error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Payment initiation failed. Please try again.' });
  }
});

// ---- M-Pesa Callback ----
app.post('/mpesa/callback', async (req, res) => {
  try {
    const body    = req.body?.Body?.stkCallback;
    const code    = body?.ResultCode;
    const checkId = body?.CheckoutRequestID;
    const amount  = body?.CallbackMetadata?.Item?.find(i => i.Name === 'Amount')?.Value;
    const mpesaRef = body?.CallbackMetadata?.Item?.find(i => i.Name === 'MpesaReceiptNumber')?.Value;

    console.log(`[Daraja] Callback — CheckoutID: ${checkId}, Code: ${code}`);

    if (code === 0 && checkId) {
      const snap = await db.collection('payments').where('checkoutRequestId', '==', checkId).get();
      if (!snap.empty) {
        const payDoc = snap.docs[0];
        const { projectId } = payDoc.data();
        if (projectId) {
          const projRef  = db.collection('projects').doc(projectId);
          const projSnap = await projRef.get();
          if (projSnap.exists) {
            const currentPaid = parseFloat(projSnap.data().paid) || 0;
            const newPaid     = currentPaid + parseFloat(amount || 0);
            const total       = parseFloat(projSnap.data().amount) || 0;
            await projRef.update({
              paid:          newPaid,
              paymentStatus: newPaid >= total ? 'paid' : 'partial',
              lastPayment:   admin.firestore.FieldValue.serverTimestamp(),
              lastMpesaRef:  mpesaRef || '',
            });
            console.log(`[Daraja] Project ${projectId} updated — KSh ${amount} paid`);
          }
        }
        await payDoc.ref.update({ status: 'COMPLETED', mpesaRef: mpesaRef || '', paidAt: admin.firestore.FieldValue.serverTimestamp() });
      }
    } else {
      if (checkId) {
        const snap = await db.collection('payments').where('checkoutRequestId', '==', checkId).get();
        snap.forEach(doc => doc.ref.update({ status: 'FAILED' }));
      }
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('[Daraja] Callback error:', err.message);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// ---- Check Payment Status ----
app.get('/mpesa/status/:checkoutRequestId', async (req, res) => {
  try {
    const snap = await db.collection('payments').where('checkoutRequestId', '==', req.params.checkoutRequestId).get();
    if (snap.empty) return res.json({ status: 'PENDING' });
    const data = snap.docs[0].data();
    res.json({ status: data.status, mpesaRef: data.mpesaRef || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Dadris] Payment server running on port ${PORT} (${process.env.MPESA_ENV || 'sandbox'})`);
});
