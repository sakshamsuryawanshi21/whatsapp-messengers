let io;

module.exports = {
  init: (server) => {
    io = require('socket.io')(server, {
      cors: { 
        origin:'https://whatsapp-messengers.vercel.app' 
      },
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
