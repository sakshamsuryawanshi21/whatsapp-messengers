let io;

module.exports = {
  init: (server) => {
    io = require('socket.io')(server, {
          "Access-Control-Allow-Origin": "*",
          origin: ["https://whatsapp-messengers.vercel.app","http://localhost:5174",],
          methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
          allowedHeaders: "Content-Type,Authorization", // Specify the allowed headers
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
