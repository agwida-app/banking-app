import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { adminToken, email, newPassword } = req.body;

  // Verify admin token
  if (adminToken !== process.env.ADMIN_SECRET_TOKEN) {
    return res.status(403).json({ error: "غير مصرح" });
  }

  if (!email || !newPassword) {
    return res.status(400).json({ error: "البريد وكلمة المرور مطلوبان" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "كلمة المرور قصيرة (6+ أحرف)" });
  }

  try {
    const user = await admin.auth().getUserByEmail(email.trim());
    await admin.auth().updateUser(user.uid, { password: newPassword });
    return res.status(200).json({ success: true, message: "تم تغيير كلمة المرور ✅" });
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      return res.status(404).json({ error: "البريد غير مسجل" });
    }
    return res.status(500).json({ error: "خطأ: " + e.message });
  }
}
