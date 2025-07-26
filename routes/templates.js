const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Template = require('../models/Template');

// Get all templates
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category || '';
    const search = req.query.search || '';

    let query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const templates = await Template.find(query)
      .sort({ lastUsed: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Template.countDocuments(query);
    const categories = await Template.distinct('category', { isActive: true });

    res.json({
      success: true,
      data: {
        templates,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        categories: categories.filter(c => c)
      }
    });
  } catch (error) {
    req.logger.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get templates',
      error: error.message
    });
  }
});

// Get template by ID
router.get('/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    req.logger.error('Get template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get template',
      error: error.message
    });
  }
});

// Create new template
router.post('/', [
  body('name').notEmpty().trim(),
  body('content').notEmpty().trim()
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

    const { name, content, type, category, variables } = req.body;

    const template = new Template({
      name,
      content,
      type: type || 'text',
      category,
      variables: variables || []
    });

    await template.save();

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    req.logger.error('Create template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message
    });
  }
});

// Update template
router.put('/:id', [
  body('name').optional().trim(),
  body('content').optional().trim()
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

    const { name, content, type, category, variables, isActive } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (content) updateData.content = content;
    if (type) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (variables !== undefined) updateData.variables = variables;
    if (isActive !== undefined) updateData.isActive = isActive;

    const template = await Template.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    req.logger.error('Update template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message
    });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    req.logger.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message
    });
  }
});

// Use template (increment usage count)
router.post('/:id/use', async (req, res) => {
  try {
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      { 
        $inc: { usageCount: 1 },
        lastUsed: new Date()
      },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template usage recorded',
      data: template
    });
  } catch (error) {
    req.logger.error('Use template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record template usage',
      error: error.message
    });
  }
});

module.exports = router;
