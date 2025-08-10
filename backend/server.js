require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const socket = require('./socket');

const app = express();
const server = http.createServer(app);
const io = socket.init(server);

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL, // set this in your .env to https://whatsapp-messengers.vercel.app
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());

// Import routes
app.use('/api', require('./routes/messages'));
app.use('/webhook', require('./routes/webhook'));

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected');
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});
