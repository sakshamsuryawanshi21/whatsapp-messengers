let io;

module.exports = {
  init: (server) => {
    io = require('socket.io')(server, {
  cors: { 
    origin: ['http://localhost:5173', 'https://whatsapp-messengers.vercel.app'],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },
};
