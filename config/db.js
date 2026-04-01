
// ใช้งาน Mongoose
const mongoose = require('mongoose')

// ดึงค่า URL จากไฟล์ .env (ถ้าไม่มีให้ใช้ค่า Default เป็น localhost)
const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/BREADSHOP'

// เชื่อมไปยัง MongoDB
mongoose.connect(dbUrl).catch(err => console.error('❌ Connection Error:', err))

mongoose.connection.on('connected', () => console.log('✅ MongoDB Connected'));

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔴 MongoDB connection closed');
  process.exit(0);
});