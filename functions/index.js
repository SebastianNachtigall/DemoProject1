const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// Get all props
exports.getProps = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    const snapshot = await db.collection('props').get();
    const props = [];
    snapshot.forEach(doc => {
      props.push({ id: doc.id, ...doc.data() });
    });
    res.json(props);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create order
exports.createOrder = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const order = req.body;
    const docRef = await db.collection('orders').add({
      ...order,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Get email settings
    const settingsDoc = await db.collection('settings').doc('email').get();
    const emailSettings = settingsDoc.data();

    if (emailSettings) {
      const transporter = nodemailer.createTransport({
        host: emailSettings.smtpServer,
        port: emailSettings.smtpPort,
        secure: emailSettings.useTls,
        auth: {
          user: emailSettings.username,
          pass: emailSettings.password
        }
      });

      await transporter.sendMail({
        from: emailSettings.username,
        to: order.email,
        subject: 'Order Confirmation',
        text: `Thank you for your order! Your order ID is: ${docRef.id}`
      });
    }

    res.json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seed database
exports.seedDatabase = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // Sample props data
    const props = [
      {
        name: "Lightsaber",
        description: "A elegant weapon for a more civilized age",
        price: 999.99,
        imageUrl: "https://example.com/lightsaber.jpg"
      },
      // Add more sample props here
    ];

    // Add props to Firestore
    const batch = db.batch();
    props.forEach(prop => {
      const docRef = db.collection('props').doc();
      batch.set(docRef, prop);
    });

    // Add email settings
    const emailSettings = {
      smtpServer: "smtp.gmail.com",
      smtpPort: 587,
      username: "your-email@gmail.com",
      password: "",
      useTls: true
    };
    batch.set(db.collection('settings').doc('email'), emailSettings);

    await batch.commit();
    res.json({ message: 'Database seeded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
