const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Contact = require('../models/Contact');
const moment = require('moment');

// Get message statistics by date range
router.get('/messages', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const start = startDate ? new Date(startDate) : moment().subtract(30, 'days').toDate();
    const end = endDate ? new Date(endDate) : new Date();

    // Overall statistics
    const overallStats = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
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

    // Time series data
    let dateFormat;
    switch (groupBy) {
      case 'hour':
        dateFormat = '%Y-%m-%d %H:00:00';
        break;
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%U';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const timeSeriesData = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: '$createdAt' }
          },
          messages: { $sum: 1 },
          recipients: { $sum: '$totalRecipients' },
          sent: { $sum: '$sentCount' },
          delivered: { $sum: '$deliveredCount' },
          read: { $sum: '$readCount' },
          failed: { $sum: '$failedCount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Success rate by day
    const successRates = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          totalRecipients: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          avgSuccessRate: {
            $avg: {
              $multiply: [
                { $divide: ['$sentCount', '$totalRecipients'] },
                100
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overall: overallStats[0] || {
          totalMessages: 0,
          totalRecipients: 0,
          totalSent: 0,
          totalDelivered: 0,
          totalRead: 0,
          totalFailed: 0
        },
        timeSeries: timeSeriesData,
        successRates: successRates,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          groupBy
        }
      }
    });
  } catch (error) {
    req.logger.error('Get message reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get message reports',
      error: error.message
    });
  }
});

// Get contact statistics
router.get('/contacts', async (req, res) => {
  try {
    const totalContacts = await Contact.countDocuments({ isActive: true });
    const blockedContacts = await Contact.countDocuments({ isBlocked: true });
    const activeContacts = await Contact.countDocuments({ 
      isActive: true, 
      isBlocked: false 
    });

    // Contacts by tags
    const contactsByTags = await Contact.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Contacts by groups
    const contactsByGroups = await Contact.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$groups' },
      {
        $group: {
          _id: '$groups',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Top contacts by messages sent
    const topContacts = await Contact.find({ isActive: true })
      .sort({ totalMessagesSent: -1 })
      .limit(10)
      .select('name phone totalMessagesSent lastMessageSent');

    // Recent contacts (added in last 30 days)
    const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
    const recentContacts = await Contact.countDocuments({
      isActive: true,
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      data: {
        overview: {
          total: totalContacts,
          active: activeContacts,
          blocked: blockedContacts,
          recent: recentContacts
        },
        byTags: contactsByTags,
        byGroups: contactsByGroups,
        topContacts: topContacts
      }
    });
  } catch (error) {
    req.logger.error('Get contact reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contact reports',
      error: error.message
    });
  }
});

// Get performance metrics
router.get('/performance', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = moment().subtract(parseInt(days), 'days').toDate();

    // Message delivery performance
    const deliveryStats = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          avgDeliveryRate: {
            $avg: {
              $cond: [
                { $gt: ['$totalRecipients', 0] },
                { $multiply: [{ $divide: ['$deliveredCount', '$totalRecipients'] }, 100] },
                0
              ]
            }
          },
          avgReadRate: {
            $avg: {
              $cond: [
                { $gt: ['$totalRecipients', 0] },
                { $multiply: [{ $divide: ['$readCount', '$totalRecipients'] }, 100] },
                0
              ]
            }
          },
          avgFailureRate: {
            $avg: {
              $cond: [
                { $gt: ['$totalRecipients', 0] },
                { $multiply: [{ $divide: ['$failedCount', '$totalRecipients'] }, 100] },
                0
              ]
            }
          }
        }
      }
    ]);

    // Messages per hour analysis
    const hourlyDistribution = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
          avgSuccessRate: {
            $avg: {
              $cond: [
                { $gt: ['$totalRecipients', 0] },
                { $multiply: [{ $divide: ['$sentCount', '$totalRecipients'] }, 100] },
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Response time analysis (time between message creation and sending)
    const responseTimeStats = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isCompleted: true
        }
      },
      {
        $project: {
          processingTime: {
            $subtract: ['$updatedAt', '$createdAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          avgProcessingTime: { $avg: '$processingTime' },
          minProcessingTime: { $min: '$processingTime' },
          maxProcessingTime: { $max: '$processingTime' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        delivery: deliveryStats[0] || {
          avgDeliveryRate: 0,
          avgReadRate: 0,
          avgFailureRate: 0
        },
        hourlyDistribution: hourlyDistribution,
        processingTime: responseTimeStats[0] || {
          avgProcessingTime: 0,
          minProcessingTime: 0,
          maxProcessingTime: 0
        },
        period: {
          days: parseInt(days),
          startDate: startDate.toISOString()
        }
      }
    });
  } catch (error) {
    req.logger.error('Get performance reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance reports',
      error: error.message
    });
  }
});

// Export detailed report
router.get('/export', async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    const start = startDate ? new Date(startDate) : moment().subtract(30, 'days').toDate();
    const end = endDate ? new Date(endDate) : new Date();

    const messages = await Message.find({
      createdAt: { $gte: start, $lte: end }
    }).populate('recipients.contactId', 'name phone');

    const reportData = messages.map(message => ({
      id: message._id,
      content: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
      type: message.type,
      totalRecipients: message.totalRecipients,
      sentCount: message.sentCount,
      deliveredCount: message.deliveredCount,
      readCount: message.readCount,
      failedCount: message.failedCount,
      successRate: message.totalRecipients > 0 ? 
        ((message.sentCount / message.totalRecipients) * 100).toFixed(2) + '%' : '0%',
      createdAt: message.createdAt.toISOString(),
      isCompleted: message.isCompleted
    }));

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=message-report.csv');

      const csvHeaders = Object.keys(reportData[0] || {}).join(',');
      const csvRows = reportData.map(row => Object.values(row).join(',')).join('\n');
      
      res.send(csvHeaders + '\n' + csvRows);
    } else {
      res.json({
        success: true,
        data: {
          messages: reportData,
          summary: {
            totalMessages: reportData.length,
            period: {
              start: start.toISOString(),
              end: end.toISOString()
            }
          }
        }
      });
    }
  } catch (error) {
    req.logger.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
      error: error.message
    });
  }
});

module.exports = router;
