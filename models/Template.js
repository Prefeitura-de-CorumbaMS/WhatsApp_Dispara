const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'document'],
    default: 'text'
  },
  mediaUrl: {
    type: String
  },
  mediaFilename: {
    type: String
  },
  variables: [{
    name: {
      type: String,
      required: true
    },
    placeholder: {
      type: String,
      required: true
    },
    description: {
      type: String
    }
  }],
  category: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date
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
templateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better search performance
templateSchema.index({ name: 'text', content: 'text' });
templateSchema.index({ category: 1 });
templateSchema.index({ isActive: 1 });

module.exports = mongoose.model('Template', templateSchema);
