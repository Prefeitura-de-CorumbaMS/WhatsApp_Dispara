const express = require('express');
const router = express.Router();
const WhatsAppService = require('../services/WhatsAppService');
const WhatsAppSession = require('../models/WhatsAppSession');

// Initialize WhatsApp service when module loads
WhatsAppService.initialize().catch(console.error);

// Get connection status
router.get('/status', async (req, res) => {
  try {
    const status = await WhatsAppService.getConnectionStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    req.logger.error('Get WhatsApp status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connection status',
      error: error.message
    });
  }
});

// Get QR Code for connection
router.get('/qr', async (req, res) => {
  try {
    const status = await WhatsAppService.getConnectionStatus();
    
    if (status.isConnected) {
      return res.json({
        success: true,
        message: 'Already connected',
        data: { connected: true }
      });
    }

    if (status.qrCode) {
      return res.json({
        success: true,
        data: { qrCode: status.qrCode }
      });
    }

    res.json({
      success: false,
      message: 'QR Code not available. Connection may be in progress.'
    });
  } catch (error) {
    req.logger.error('Get QR Code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get QR Code',
      error: error.message
    });
  }
});

// Restart connection
router.post('/restart', async (req, res) => {
  try {
    await WhatsAppService.restartConnection();
    res.json({
      success: true,
      message: 'Connection restart initiated'
    });
  } catch (error) {
    req.logger.error('Restart connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restart connection',
      error: error.message
    });
  }
});

// Disconnect
router.post('/disconnect', async (req, res) => {
  try {
    await WhatsAppService.disconnect();
    res.json({
      success: true,
      message: 'Disconnected successfully'
    });
  } catch (error) {
    req.logger.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect',
      error: error.message
    });
  }
});

// Get WhatsApp contacts
router.get('/contacts', async (req, res) => {
  try {
    const status = await WhatsAppService.getConnectionStatus();
    
    if (!status.isConnected) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp not connected'
      });
    }

    const contacts = await WhatsAppService.getContacts();
    res.json({
      success: true,
      data: contacts
    });
  } catch (error) {
    req.logger.error('Get WhatsApp contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contacts',
      error: error.message
    });
  }
});

// Send test message
router.post('/test-message', async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required'
      });
    }

    const status = await WhatsAppService.getConnectionStatus();
    
    if (!status.isConnected) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp not connected'
      });
    }

    const result = await WhatsAppService.sendMessage(to, message);
    
    res.json({
      success: true,
      message: 'Test message sent successfully',
      data: result
    });
  } catch (error) {
    req.logger.error('Send test message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test message',
      error: error.message
    });
  }
});

module.exports = router;
