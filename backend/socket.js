let io;

module.exports = {
  init: (server) => {
    io = require('socket.io')(server, {
          
          origin: ['https://whatsapp-messengers.vercel.app', 'http://localhost:5174'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    });
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },
};
