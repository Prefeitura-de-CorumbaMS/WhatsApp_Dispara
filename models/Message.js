const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'document', 'audio'],
    default: 'text'
  },
  mediaUrl: {
    type: String
  },
  mediaFilename: {
    type: String
  },
  recipients: [{
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending'
    },
    sentAt: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    readAt: {
      type: Date
    },
    errorMessage: {
      type: String
    },
    retryCount: {
      type: Number,
      default: 0
    }
  }],
  totalRecipients: {
    type: Number,
    default: 0
  },
  sentCount: {
    type: Number,
    default: 0
  },
  deliveredCount: {
    type: Number,
    default: 0
  },
  readCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  scheduledFor: {
    type: Date
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
messageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.totalRecipients = this.recipients.length;
  this.sentCount = this.recipients.filter(r => r.status === 'sent' || r.status === 'delivered' || r.status === 'read').length;
  this.deliveredCount = this.recipients.filter(r => r.status === 'delivered' || r.status === 'read').length;
  this.readCount = this.recipients.filter(r => r.status === 'read').length;
  this.failedCount = this.recipients.filter(r => r.status === 'failed').length;
  this.isCompleted = this.recipients.every(r => r.status !== 'pending');
  next();
});

// Index for better performance
messageSchema.index({ createdAt: -1 });
messageSchema.index({ isScheduled: 1, scheduledFor: 1 });
messageSchema.index({ 'recipients.status': 1 });

module.exports = mongoose.model('Message', messageSchema);
