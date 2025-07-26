const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const WhatsAppService = require('../services/WhatsAppService');
const WhatsAppSession = require('../models/WhatsAppSession');

// Get system information
router.get('/system', async (req, res) => {
  try {
    const systemInfo = {
      server: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          processUsed: process.memoryUsage()
        },
        cpu: {
          model: os.cpus()[0]?.model || 'Unknown',
          cores: os.cpus().length,
          loadAverage: os.loadavg()
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    req.logger.error('Get system info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system information',
      error: error.message
    });
  }
});

// Get database status
router.get('/database', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    let dbStats = null;
    let collections = [];

    if (dbState === 1) {
      try {
        // Get database statistics
        const admin = mongoose.connection.db.admin();
        dbStats = await admin.serverStatus();

        // Get collection information
        const collectionNames = await mongoose.connection.db.listCollections().toArray();
        collections = await Promise.all(
          collectionNames.map(async (col) => {
            try {
              const stats = await mongoose.connection.db.collection(col.name).stats();
              return {
                name: col.name,
                count: stats.count || 0,
                size: stats.size || 0,
                avgObjSize: stats.avgObjSize || 0,
                indexes: stats.nindexes || 0
              };
            } catch (error) {
              return {
                name: col.name,
                count: 0,
                size: 0,
                avgObjSize: 0,
                indexes: 0,
                error: error.message
              };
            }
          })
        );
      } catch (error) {
        req.logger.error('Database stats error:', error);
      }
    }

    const databaseInfo = {
      status: states[dbState] || 'unknown',
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      collections: collections,
      stats: dbStats ? {
        uptime: dbStats.uptime,
        connections: dbStats.connections,
        network: dbStats.network,
        opcounters: dbStats.opcounters
      } : null
    };

    res.json({
      success: true,
      data: databaseInfo
    });
  } catch (error) {
    req.logger.error('Get database info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get database information',
      error: error.message
    });
  }
});

// Get WhatsApp connection status
router.get('/whatsapp', async (req, res) => {
  try {
    const connectionStatus = await WhatsAppService.getConnectionStatus();
    const session = await WhatsAppSession.findOne({ sessionId: 'main-session' });

    const whatsappInfo = {
      connection: connectionStatus,
      session: session ? {
        sessionId: session.sessionId,
        connectionStatus: session.connectionStatus,
        lastConnected: session.lastConnected,
        lastDisconnected: session.lastDisconnected,
        connectionAttempts: session.connectionAttempts,
        maxConnectionAttempts: session.maxConnectionAttempts,
        errorMessage: session.errorMessage
      } : null,
      service: {
        isInitialized: WhatsAppService.socket !== null,
        messageDelay: WhatsAppService.messageDelay,
        maxRetries: WhatsAppService.maxRetries
      }
    };

    res.json({
      success: true,
      data: whatsappInfo
    });
  } catch (error) {
    req.logger.error('Get WhatsApp info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get WhatsApp information',
      error: error.message
    });
  }
});

// Get application logs
router.get('/logs', async (req, res) => {
  try {
    const { type = 'combined', lines = 100 } = req.query;
    const logFile = type === 'error' ? 'logs/error.log' : 'logs/combined.log';
    const logPath = path.join(process.cwd(), logFile);

    try {
      await fs.access(logPath);
      const logContent = await fs.readFile(logPath, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim());
      const recentLines = logLines.slice(-parseInt(lines));

      const parsedLogs = recentLines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line, timestamp: new Date().toISOString() };
        }
      });

      res.json({
        success: true,
        data: {
          logs: parsedLogs,
          totalLines: logLines.length,
          requestedLines: parseInt(lines),
          logFile: logFile
        }
      });
    } catch (fileError) {
      res.json({
        success: true,
        data: {
          logs: [],
          totalLines: 0,
          requestedLines: parseInt(lines),
          logFile: logFile,
          message: 'Log file not found or empty'
        }
      });
    }
  } catch (error) {
    req.logger.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get logs',
      error: error.message
    });
  }
});

// Get application metrics
router.get('/metrics', async (req, res) => {
  try {
    const Message = require('../models/Message');
    const Contact = require('../models/Contact');
    const Template = require('../models/Template');

    // Get recent activity metrics
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const metrics = {
      messages: {
        total: await Message.countDocuments(),
        last24h: await Message.countDocuments({ createdAt: { $gte: last24h } }),
        last7d: await Message.countDocuments({ createdAt: { $gte: last7d } }),
        pending: await Message.countDocuments({ isCompleted: false }),
        scheduled: await Message.countDocuments({ isScheduled: true, scheduledFor: { $gt: now } })
      },
      contacts: {
        total: await Contact.countDocuments({ isActive: true }),
        blocked: await Contact.countDocuments({ isBlocked: true }),
        withMessages: await Contact.countDocuments({ totalMessagesSent: { $gt: 0 } }),
        recentlyAdded: await Contact.countDocuments({ createdAt: { $gte: last7d } })
      },
      templates: {
        total: await Template.countDocuments({ isActive: true }),
        used: await Template.countDocuments({ usageCount: { $gt: 0 } }),
        recentlyUsed: await Template.countDocuments({ lastUsed: { $gte: last24h } })
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    req.logger.error('Get metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get metrics',
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy',
        whatsapp: (await WhatsAppService.getConnectionStatus()).isConnected ? 'connected' : 'disconnected'
      },
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };

    // Determine overall health
    const isHealthy = health.services.database === 'healthy';
    health.status = isHealthy ? 'healthy' : 'degraded';

    res.status(isHealthy ? 200 : 503).json({
      success: true,
      data: health
    });
  } catch (error) {
    req.logger.error('Health check error:', error);
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Clear logs
router.delete('/logs', async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    
    const logFiles = [];
    if (type === 'all' || type === 'combined') {
      logFiles.push('logs/combined.log');
    }
    if (type === 'all' || type === 'error') {
      logFiles.push('logs/error.log');
    }

    for (const logFile of logFiles) {
      const logPath = path.join(process.cwd(), logFile);
      try {
        await fs.writeFile(logPath, '');
      } catch (error) {
        req.logger.warn(`Could not clear log file ${logFile}:`, error.message);
      }
    }

    res.json({
      success: true,
      message: 'Logs cleared successfully',
      data: { clearedFiles: logFiles }
    });
  } catch (error) {
    req.logger.error('Clear logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear logs',
      error: error.message
    });
  }
});

module.exports = router;
