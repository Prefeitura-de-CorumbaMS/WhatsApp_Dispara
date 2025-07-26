const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  whatsappId: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  groups: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  lastMessageSent: {
    type: Date
  },
  totalMessagesSent: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
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
contactSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better search performance
contactSchema.index({ phone: 1 });
contactSchema.index({ name: 'text', phone: 'text' });
contactSchema.index({ tags: 1 });
contactSchema.index({ groups: 1 });

module.exports = mongoose.model('Contact', contactSchema);
