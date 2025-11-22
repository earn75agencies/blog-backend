/**
 * WebSocket Service
 * Real-time communication for chat, notifications, live updates
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../../models/User.model');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userRooms = new Map(); // userId -> Set of room names
  }

  /**
   * Initialize WebSocket server
   * @param {Object} httpServer - HTTP server instance
   * @returns {Object} Socket.IO instance
   */
  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    return this.io;
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('_id username role');
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.userId}`);

      // Store connection
      this.connectedUsers.set(socket.userId, socket.id);
      socket.join(`user:${socket.userId}`);

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userId}`);
        this.connectedUsers.delete(socket.userId);
        const rooms = this.userRooms.get(socket.userId);
        if (rooms) {
          rooms.forEach(room => socket.leave(room));
          this.userRooms.delete(socket.userId);
        }
      });

      // Chat events
      socket.on('chat:join', (chatId) => {
        const room = `chat:${chatId}`;
        socket.join(room);
        this.addUserRoom(socket.userId, room);
        socket.emit('chat:joined', { chatId, room });
      });

      socket.on('chat:leave', (chatId) => {
        const room = `chat:${chatId}`;
        socket.leave(room);
        this.removeUserRoom(socket.userId, room);
      });

      socket.on('chat:message', async (data) => {
        const { chatId, message } = data;
        const room = `chat:${chatId}`;
        
        // Broadcast to room
        socket.to(room).emit('chat:message', {
          chatId,
          message,
          sender: socket.userId,
          timestamp: new Date(),
        });
      });

      // Notification events
      socket.on('notifications:subscribe', () => {
        socket.join(`notifications:${socket.userId}`);
      });

      socket.on('notifications:unsubscribe', () => {
        socket.leave(`notifications:${socket.userId}`);
      });

      // Live updates
      socket.on('live:subscribe', (resourceType, resourceId) => {
        const room = `live:${resourceType}:${resourceId}`;
        socket.join(room);
        this.addUserRoom(socket.userId, room);
      });

      socket.on('live:unsubscribe', (resourceType, resourceId) => {
        const room = `live:${resourceType}:${resourceId}`;
        socket.leave(room);
        this.removeUserRoom(socket.userId, room);
      });

      // Typing indicators
      socket.on('typing:start', (data) => {
        const { chatId } = data;
        socket.to(`chat:${chatId}`).emit('typing:start', {
          userId: socket.userId,
          chatId,
        });
      });

      socket.on('typing:stop', (data) => {
        const { chatId } = data;
        socket.to(`chat:${chatId}`).emit('typing:stop', {
          userId: socket.userId,
          chatId,
        });
      });
    });
  }

  /**
   * Send notification to user
   * @param {String} userId - User ID
   * @param {Object} notification - Notification data
   */
  sendNotification(userId, notification) {
    const room = `notifications:${userId}`;
    this.io.to(room).emit('notification', notification);
  }

  /**
   * Send message to chat
   * @param {String} chatId - Chat ID
   * @param {Object} message - Message data
   */
  sendChatMessage(chatId, message) {
    const room = `chat:${chatId}`;
    this.io.to(room).emit('chat:message', message);
  }

  /**
   * Broadcast live update
   * @param {String} resourceType - Resource type (post, comment, etc.)
   * @param {String} resourceId - Resource ID
   * @param {Object} update - Update data
   */
  broadcastLiveUpdate(resourceType, resourceId, update) {
    const room = `live:${resourceType}:${resourceId}`;
    this.io.to(room).emit('live:update', {
      resourceType,
      resourceId,
      update,
      timestamp: new Date(),
    });
  }

  /**
   * Get online users
   * @param {Array} userIds - User IDs to check
   * @returns {Array} Online user IDs
   */
  getOnlineUsers(userIds) {
    return userIds.filter(userId => this.connectedUsers.has(userId));
  }

  /**
   * Check if user is online
   * @param {String} userId - User ID
   * @returns {Boolean} Is user online
   */
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  // Helper Methods

  addUserRoom(userId, room) {
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId).add(room);
  }

  removeUserRoom(userId, room) {
    if (this.userRooms.has(userId)) {
      this.userRooms.get(userId).delete(room);
      if (this.userRooms.get(userId).size === 0) {
        this.userRooms.delete(userId);
      }
    }
  }
}

module.exports = new WebSocketService();

