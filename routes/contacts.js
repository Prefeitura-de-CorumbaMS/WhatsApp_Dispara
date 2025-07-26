const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const WhatsAppService = require('../services/WhatsAppService');

// Configure multer for CSV uploads
const upload = multer({ dest: 'uploads/' });

// Get all contacts with pagination and filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const tag = req.query.tag || '';
    const group = req.query.group || '';

    let query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (tag) {
      query.tags = tag;
    }

    if (group) {
      query.groups = group;
    }

    const contacts = await Contact.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Contact.countDocuments(query);

    // Get unique tags and groups for filters
    const tags = await Contact.distinct('tags', { isActive: true });
    const groups = await Contact.distinct('groups', { isActive: true });

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        filters: {
          tags: tags.filter(t => t),
          groups: groups.filter(g => g)
        }
      }
    });
  } catch (error) {
    req.logger.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contacts',
      error: error.message
    });
  }
});

// Get contact by ID
router.get('/:id', async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    req.logger.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contact',
      error: error.message
    });
  }
});

// Create new contact
router.post('/', [
  body('name').notEmpty().trim(),
  body('phone').notEmpty().trim()
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

    const { name, phone, email, tags, groups, notes } = req.body;

    // Check if contact already exists
    const existingContact = await Contact.findOne({ phone });
    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'Contact with this phone number already exists'
      });
    }

    const contact = new Contact({
      name,
      phone: phone.replace(/\D/g, ''), // Remove non-digits
      email,
      tags: tags || [],
      groups: groups || [],
      notes
    });

    await contact.save();

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: contact
    });
  } catch (error) {
    req.logger.error('Create contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create contact',
      error: error.message
    });
  }
});

// Update contact
router.put('/:id', [
  body('name').optional().trim(),
  body('phone').optional().trim()
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

    const { name, phone, email, tags, groups, notes, isActive } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone.replace(/\D/g, '');
    if (email !== undefined) updateData.email = email;
    if (tags !== undefined) updateData.tags = tags;
    if (groups !== undefined) updateData.groups = groups;
    if (notes !== undefined) updateData.notes = notes;
    if (isActive !== undefined) updateData.isActive = isActive;

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact
    });
  } catch (error) {
    req.logger.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact',
      error: error.message
    });
  }
});

// Delete contact
router.delete('/:id', async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    req.logger.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact',
      error: error.message
    });
  }
});

// Import contacts from CSV
router.post('/import', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required'
      });
    }

    const results = [];
    const errors = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        let imported = 0;
        let skipped = 0;

        for (const row of results) {
          try {
            const { name, phone, email, tags, groups } = row;

            if (!name || !phone) {
              errors.push(`Row skipped: Missing name or phone - ${JSON.stringify(row)}`);
              skipped++;
              continue;
            }

            const cleanPhone = phone.replace(/\D/g, '');
            
            // Check if contact already exists
            const existingContact = await Contact.findOne({ phone: cleanPhone });
            if (existingContact) {
              skipped++;
              continue;
            }

            const contact = new Contact({
              name,
              phone: cleanPhone,
              email: email || '',
              tags: tags ? tags.split(',').map(t => t.trim()) : [],
              groups: groups ? groups.split(',').map(g => g.trim()) : []
            });

            await contact.save();
            imported++;
          } catch (error) {
            errors.push(`Error processing row: ${error.message} - ${JSON.stringify(row)}`);
            skipped++;
          }
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
          success: true,
          message: 'Import completed',
          data: {
            imported,
            skipped,
            total: results.length,
            errors: errors.slice(0, 10) // Limit errors shown
          }
        });
      });
  } catch (error) {
    req.logger.error('Import contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import contacts',
      error: error.message
    });
  }
});

// Sync contacts from WhatsApp
router.post('/sync', async (req, res) => {
  try {
    const status = await WhatsAppService.getConnectionStatus();
    
    if (!status.isConnected) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp not connected'
      });
    }

    const whatsappContacts = await WhatsAppService.getContacts();
    
    let synced = 0;
    let skipped = 0;

    for (const waContact of whatsappContacts) {
      try {
        if (!waContact.id || !waContact.name) {
          skipped++;
          continue;
        }

        const phone = waContact.id.split('@')[0];
        
        const existingContact = await Contact.findOne({ phone });
        if (existingContact) {
          // Update WhatsApp ID if not set
          if (!existingContact.whatsappId) {
            existingContact.whatsappId = waContact.id;
            await existingContact.save();
          }
          skipped++;
          continue;
        }

        const contact = new Contact({
          name: waContact.name || waContact.id,
          phone: phone,
          whatsappId: waContact.id,
          groups: ['WhatsApp Sync']
        });

        await contact.save();
        synced++;
      } catch (error) {
        req.logger.error('Error syncing contact:', error);
        skipped++;
      }
    }

    res.json({
      success: true,
      message: 'WhatsApp contacts sync completed',
      data: {
        synced,
        skipped,
        total: whatsappContacts.length
      }
    });
  } catch (error) {
    req.logger.error('Sync WhatsApp contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync WhatsApp contacts',
      error: error.message
    });
  }
});

// Export contacts to CSV
router.get('/export/csv', async (req, res) => {
  try {
    const contacts = await Contact.find({ isActive: true }).sort({ name: 1 });

    const csvData = contacts.map(contact => ({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      tags: contact.tags.join(', '),
      groups: contact.groups.join(', '),
      totalMessagesSent: contact.totalMessagesSent,
      lastMessageSent: contact.lastMessageSent ? contact.lastMessageSent.toISOString() : '',
      createdAt: contact.createdAt.toISOString()
    }));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');

    const csvHeaders = Object.keys(csvData[0] || {}).join(',');
    const csvRows = csvData.map(row => Object.values(row).join(',')).join('\n');
    
    res.send(csvHeaders + '\n' + csvRows);
  } catch (error) {
    req.logger.error('Export contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export contacts',
      error: error.message
    });
  }
});

module.exports = router;
