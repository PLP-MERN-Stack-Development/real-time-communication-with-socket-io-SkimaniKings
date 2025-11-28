const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Typical Vite port
    methods: ["GET", "POST"]
  }
});

// Store users in memory
let users = [];

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('login', (userData) => {
    const user = { ...userData, id: socket.id, status: 'online' };
    users.push(user);
    io.emit('users_list', users);
    socket.emit('login_success', user);
  });

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('send_message', (data) => {
    // data should contain { roomId, text, senderId, ... }
    // If it's a DM, roomId might be the recipient's socket ID or a unique DM ID
    if (data.roomId === 'general' || data.roomId === 'tech' || data.roomId === 'random') {
        io.to(data.roomId).emit('receive_message', data);
    } else {
        // Handle DM: emit to sender and recipient
        // Note: In this simple demo, roomId for DM is the target userId
        io.to(data.roomId).emit('receive_message', data);
        socket.emit('receive_message', data); // Echo back to sender
    }
  });

  socket.on('typing', (data) => {
    // Broadcast to room except sender
    if (data.roomId) {
        socket.to(data.roomId).emit('typing', data);
    } else {
        socket.broadcast.emit('typing', data);
    }
  });
  
  socket.on('stop_typing', (data) => {
     if (data.roomId) {
        socket.to(data.roomId).emit('stop_typing', data);
    } else {
        socket.broadcast.emit('stop_typing', data);
    }
  });

  // Call Signaling Events
  socket.on('call_user', (data) => {
      // data: { toUserId, isVideo }
      io.to(data.toUserId).emit('call_incoming', {
          fromUserId: socket.id,
          fromUserName: users.find(u => u.id === socket.id)?.username || 'Unknown',
          isVideo: data.isVideo
      });
  });

  socket.on('call_accepted', (data) => {
      // data: { toUserId }
      io.to(data.toUserId).emit('call_accepted', {
          remoteUserId: socket.id,
          remoteUserName: users.find(u => u.id === socket.id)?.username || 'Unknown',
          remoteUserAvatar: users.find(u => u.id === socket.id)?.avatar
      });
  });

  socket.on('call_rejected', (data) => {
      io.to(data.toUserId).emit('call_rejected', {});
  });

  socket.on('call_ended', (data) => {
      // Optional: notify the other peer if connected
      // In a real WebRTC setup, this would close connections
  });

  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id);
    users = users.filter(u => u.id !== socket.id);
    io.emit('users_list', users);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});