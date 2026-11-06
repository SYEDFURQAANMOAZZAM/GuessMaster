import 'dotenv/config';

import { createServer } from 'http';
import { Server } from 'socket.io';

import app from './app';
import { registerSocketHandlers } from './socketHandlers/registerSocketHandlers';

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  registerSocketHandlers(io, socket);
});

httpServer.listen(PORT, () => {
  console.log(`GuessMaster backend running on port ${PORT}`);
});