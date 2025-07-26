const jwt = require('jsonwebtoken');
const User = require('../models/User');
const WhatsAppService = require('../services/WhatsAppService');

// Middleware to check if user is authenticated
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Middleware to check WhatsApp connection for dashboard access
const requireWhatsAppConnection = async (req, res, next) => {
  try {
    const status = await WhatsAppService.getConnectionStatus();
    
    if (!status.isConnected) {
      // If it's an API request, return JSON error
      if (req.path.startsWith('/api/')) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp connection required',
          requiresConnection: true
        });
      }
      
      // If it's a page request, redirect to connection page
      return res.redirect('/');
    }
    
    next();
  } catch (error) {
    req.logger?.error('WhatsApp connection check error:', error);
    
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({
        success: false,
        message: 'Failed to check WhatsApp connection'
      });
    }
    
    return res.redirect('/');
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.SESSION_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignore token errors for optional auth
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireWhatsAppConnection,
  optionalAuth
};
