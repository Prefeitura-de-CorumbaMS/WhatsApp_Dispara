const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Contact = require('../models/Contact');
const WhatsAppService = require('../services/WhatsAppService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get all messages with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const messages = await Message.find()
      .populate('recipients.contactId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments();

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    req.logger.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message
    });
  }
});

// Get message by ID
router.get('/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('recipients.contactId', 'name phone email');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    req.logger.error('Get message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get message',
      error: error.message
    });
  }
});

// Send message to multiple contacts
router.post('/send', upload.single('media'), [
  body('content').notEmpty().trim(),
  body('recipients').isArray().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Check WhatsApp connection
    const status = await WhatsAppService.getConnectionStatus();
    if (!status.isConnected) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp not connected'
      });
    }

    const { content, recipients, scheduledFor } = req.body;
    const recipientIds = JSON.parse(recipients);

    // Get contacts
    const contacts = await Contact.find({ 
      _id: { $in: recipientIds },
      isActive: true,
      isBlocked: false
    });

    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid recipients found'
      });
    }

    // Create message record
    const messageData = {
      content,
      type: req.file ? req.file.mimetype.split('/')[0] : 'text',
      recipients: contacts.map(contact => ({
        contactId: contact._id,
        phone: contact.phone,
        name: contact.name,
        status: 'pending'
      }))
    };

    if (req.file) {
      messageData.mediaUrl = req.file.path;
      messageData.mediaFilename = req.file.originalname;
    }

    if (scheduledFor) {
      messageData.scheduledFor = new Date(scheduledFor);
      messageData.isScheduled = true;
    }

    const message = new Message(messageData);
    await message.save();

    // If not scheduled, send immediately
    if (!scheduledFor) {
      // Process sending in background
      setImmediate(async () => {
        await processBulkSending(message._id, req.logger);
      });

      res.json({
        success: true,
        message: 'Message sending initiated',
        data: { messageId: message._id }
      });
    } else {
      res.json({
        success: true,
        message: 'Message scheduled successfully',
        data: { messageId: message._id }
      });
    }
  } catch (error) {
    req.logger.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// Process bulk message sending
async function processBulkSending(messageId, logger) {
  try {
    const message = await Message.findById(messageId);
    if (!message) return;

    const delay = parseInt(process.env.MESSAGE_DELAY_MS) || 5000;
    const maxRetries = parseInt(process.env.MAX_RETRIES) || 3;

    for (let i = 0; i < message.recipients.length; i++) {
      const recipient = message.recipients[i];
      
      if (recipient.status !== 'pending') continue;

      try {
        const options = {};
        if (message.type !== 'text' && message.mediaUrl) {
          options.type = message.type;
          options.media = { url: message.mediaUrl };
          if (message.mediaFilename) {
            options.fileName = message.mediaFilename;
          }
        }

        await WhatsAppService.sendMessage(recipient.phone, message.content, options);
        
        // Update recipient status
        message.recipients[i].status = 'sent';
        message.recipients[i].sentAt = new Date();

        // Update contact last message info
        await Contact.updateOne(
          { _id: recipient.contactId },
          { 
            lastMessageSent: new Date(),
            $inc: { totalMessagesSent: 1 }
          }
        );

        logger.info(`Message sent to ${recipient.phone}`);
      } catch (error) {
        logger.error(`Failed to send message to ${recipient.phone}:`, error);
        
        message.recipients[i].retryCount = (message.recipients[i].retryCount || 0) + 1;
        
        if (message.recipients[i].retryCount >= maxRetries) {
          message.recipients[i].status = 'failed';
          message.recipients[i].errorMessage = error.message;
        }
      }

      // Save progress
      await message.save();

      // Delay between messages
      if (i < message.recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    logger.info(`Bulk sending completed for message ${messageId}`);
  } catch (error) {
    logger.error('Bulk sending error:', error);
  }
}

// Get message statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Message.aggregate([
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          totalRecipients: { $sum: '$totalRecipients' },
          totalSent: { $sum: '$sentCount' },
          totalDelivered: { $sum: '$deliveredCount' },
          totalRead: { $sum: '$readCount' },
          totalFailed: { $sum: '$failedCount' }
        }
      }
    ]);

    const result = stats[0] || {
      totalMessages: 0,
      totalRecipients: 0,
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalFailed: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    req.logger.error('Get message stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get message statistics',
      error: error.message
    });
  }
});

module.exports = router;
