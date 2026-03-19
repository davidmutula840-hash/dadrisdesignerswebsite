require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const axios      = require('axios');
const admin      = require('firebase-admin');

const app  = express();
const PORT = process.env.PORT || 3000;

// ---- CORS — only allow your GitHub Pages site ----
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'https://davidmutula840-hash.github.io',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// ---- Firebase Admin Init ----
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

// ---- PesaPal Config ----
const PESAPAL_BASE = process.env.PESAPAL_ENV === 'live'
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3';

const RENDER_URL = process.env.RENDER_URL || 'https://your-render-url.onrender.com';

// ---- Get PesaPal Auth Token ----
async function getPesapalToken() {
  const res = await axios.post(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    consumer_key:    process.env.PESAPAL_CONSUMER_KEY,
    consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
  }, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  });
  return res.data.token;
}

// ---- Register IPN (run once on startup) ----
let IPN_ID = null;
async function registerIPN() {
  try {
    const token = await getPesapalToken();
    const res = await axios.post(`${PESAPAL_BASE}/api/URLSetup/RegisterIPN`, {
      url:          `${RENDER_URL}/pesapal/ipn`,
      ipn_notification_type: 'POST',
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      }
    });
    IPN_ID = res.data.ipn_id;
    console.log('[PesaPal] IPN registered:', IPN_ID);
  } catch (err) {
    console.error('[PesaPal] IPN registration failed:', err.response?.data || err.message);
  }
}

// ---- ROUTE: Health Check ----
app.get('/', (req, res) => {
  res.json({ status: 'Dadris Payment Server running ✅', env: process.env.PESAPAL_ENV });
});

// ---- ROUTE: Initiate Payment ----
// POST /pesapal/pay
// Body: { projectId, clientId, clientName, clientEmail, clientPhone, amount, description }
app.post('/pesapal/pay', async (req, res) => {
  const { projectId, clientId, clientName, clientEmail, clientPhone, amount, description } = req.body;

  if (!projectId || !amount || !clientPhone) {
    return res.status(400).json({ error: 'Missing required fields: projectId, amount, clientPhone' });
  }

  try {
    const token = await getPesapalToken();

    // Build order reference
    const orderRef = `DADRIS-${projectId}-${Date.now()}`;

    const payload = {
      id:           orderRef,
      currency:     'KES',
      amount:       parseFloat(amount),
      description:  description || 'Dadris Designers — Design Services',
      callback_url: `${RENDER_URL}/pesapal/callback?projectId=${projectId}&clientId=${clientId}`,
      notification_id: IPN_ID,
      billing_address: {
        phone_number: clientPhone,
        email_address: clientEmail || '',
        first_name:   clientName?.split(' ')[0] || 'Client',
        last_name:    clientName?.split(' ').slice(1).join(' ') || '',
      }
    };

    const response = await axios.post(
      `${PESAPAL_BASE}/api/Transactions/SubmitOrderRequest`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
          'Accept':        'application/json',
        }
      }
    );

    const { order_tracking_id, redirect_url } = response.data;

    // Save pending payment to Firestore
    await db.collection('payments').add({
      projectId,
      clientId,
      orderRef,
      orderTrackingId: order_tracking_id,
      amount:          parseFloat(amount),
      status:          'PENDING',
      createdAt:       admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ redirect_url, order_tracking_id });

  } catch (err) {
    console.error('[PesaPal] Pay error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Payment initiation failed. Try again.' });
  }
});

// ---- ROUTE: Payment Callback (after client pays) ----
app.get('/pesapal/callback', async (req, res) => {
  const { OrderTrackingId, OrderMerchantReference, projectId, clientId } = req.query;

  try {
    const token = await getPesapalToken();

    // Check payment status
    const statusRes = await axios.get(
      `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept':        'application/json',
        }
      }
    );

    const { payment_status_description, amount, currency } = statusRes.data;
    const isCompleted = payment_status_description === 'Completed';

    if (isCompleted && projectId) {
      // Update project payment status in Firestore
      await db.collection('projects').doc(projectId).update({
        paymentStatus: 'paid',
        paid:          amount,
        lastPayment:   admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update payments collection
      const paymentsSnap = await db.collection('payments')
        .where('orderTrackingId', '==', OrderTrackingId).get();
      paymentsSnap.forEach(doc => doc.ref.update({ status: 'COMPLETED' }));

      console.log(`[PesaPal] Payment completed for project ${projectId}: KES ${amount}`);
    }

    // Redirect client back to portal with status
    const status = isCompleted ? 'success' : 'pending';
    res.redirect(
      `https://davidmutula840-hash.github.io/dadrisdesignerswebsite/client-portal/portal.html?payment=${status}&amount=${amount}`
    );

  } catch (err) {
    console.error('[PesaPal] Callback error:', err.response?.data || err.message);
    res.redirect(
      `https://davidmutula840-hash.github.io/dadrisdesignerswebsite/client-portal/portal.html?payment=error`
    );
  }
});

// ---- ROUTE: IPN Notification ----
app.post('/pesapal/ipn', async (req, res) => {
  const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.body;

  try {
    const token = await getPesapalToken();

    const statusRes = await axios.get(
      `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept':        'application/json',
        }
      }
    );

    const { payment_status_description, amount } = statusRes.data;

    if (payment_status_description === 'Completed') {
      // Find project from payments collection
      const paymentsSnap = await db.collection('payments')
        .where('orderTrackingId', '==', OrderTrackingId).get();

      paymentsSnap.forEach(async (doc) => {
        const { projectId } = doc.data();
        if (projectId) {
          await db.collection('projects').doc(projectId).update({
            paymentStatus: 'paid',
            paid:          amount,
            lastPayment:   admin.firestore.FieldValue.serverTimestamp(),
          });
          await doc.ref.update({ status: 'COMPLETED' });
          console.log(`[PesaPal] IPN: Project ${projectId} marked paid KES ${amount}`);
        }
      });
    }

    res.json({ orderNotificationType: OrderNotificationType, orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: '200' });

  } catch (err) {
    console.error('[PesaPal] IPN error:', err.message);
    res.status(500).json({ status: 'error' });
  }
});

// ---- Start Server ----
app.listen(PORT, async () => {
  console.log(`[Dadris] Payment server running on port ${PORT}`);
  await registerIPN();
});
