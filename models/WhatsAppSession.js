const mongoose = require('mongoose');

const whatsappSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    default: 'main-session'
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  qrCode: {
    type: String
  },
  sessionData: {
    type: mongoose.Schema.Types.Mixed
  },
  connectionStatus: {
    type: String,
    enum: ['disconnected', 'connecting', 'connected', 'qr_required', 'error'],
    default: 'disconnected'
  },
  lastConnected: {
    type: Date
  },
  lastDisconnected: {
    type: Date
  },
  errorMessage: {
    type: String
  },
  connectionAttempts: {
    type: Number,
    default: 0
  },
  maxConnectionAttempts: {
    type: Number,
    default: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt field before saving
whatsappSessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('WhatsAppSession', whatsappSessionSchema);
