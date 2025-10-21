const express = require('express');
const Channel = require('../models/Channel');
const Data = require('../models/Data');
const crypto = require('crypto');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Get all channels for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const channels = await Channel.find({ userId: req.session.userId });
    res.json(channels);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new channel
router.post('/', requireAuth, async (req, res) => {
  try {
    console.log('Creating channel with data:', req.body);
    const { name, description, fields, isPublic } = req.body;
    
    // Check channel limit (4 channels per user)
    const existingChannels = await Channel.countDocuments({ userId: req.session.userId });
    console.log('Existing channels count:', existingChannels);
    if (existingChannels >= 4) {
      return res.status(400).json({ message: 'Maximum 4 channels allowed per account' });
    }
    
    // Generate unique write API key
    let writeApiKey;
    let attempts = 0;
    const maxAttempts = 5;
    
    do {
      writeApiKey = crypto.randomBytes(16).toString('hex');
      console.log('Generated API key attempt', attempts + 1, ':', writeApiKey);
      
      const existingChannel = await Channel.findOne({ writeApiKey: writeApiKey });
      if (!existingChannel) {
        console.log('API key is unique, proceeding...');
        break; // Key is unique
      }
      
      console.log('API key collision detected, retrying...');
      attempts++;
    } while (attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
      console.error('Failed to generate unique write API key after', maxAttempts, 'attempts');
      return res.status(500).json({ message: 'Failed to generate unique API key' });
    }
    
    const channel = new Channel({
      name,
      description,
      userId: req.session.userId,
      apiKey: writeApiKey, // For backward compatibility
      writeApiKey,
      fields: fields || [],
      isPublic: Boolean(isPublic),
      isPrivate: !Boolean(isPublic)
    });
    
    console.log('Saving channel:', channel);
    
    // Try to save with retry logic for duplicate key errors
    let saveAttempts = 0;
    const maxSaveAttempts = 3;
    
    while (saveAttempts < maxSaveAttempts) {
      try {
        await channel.save();
        console.log('Channel saved successfully:', channel._id);
        return res.status(201).json(channel);
      } catch (saveError) {
        if (saveError.code === 11000 && saveAttempts < maxSaveAttempts - 1) {
          // Duplicate key error, generate new API key and retry
          console.log('Duplicate key error during save, generating new API key...');
          const newApiKey = crypto.randomBytes(16).toString('hex');
          channel.apiKey = newApiKey;
          channel.writeApiKey = newApiKey;
          saveAttempts++;
        } else {
          throw saveError; // Re-throw if not duplicate key or max attempts reached
        }
      }
    }
  } catch (error) {
    console.error('Error creating channel:', error);
    if (error.code === 11000) {
      // Duplicate key error
      res.status(400).json({ message: 'Unable to generate unique API key, please try again' });
    } else if (error.name === 'ValidationError') {
      res.status(400).json({ message: 'Validation error', details: error.message });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// Get specific channel
router.get('/:id', requireAuth, async (req, res) => {
  try {
    let channelId = req.params.id.replace(/[{}]/g, '').trim();
    
    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(channelId)) {
      return res.status(400).json({ message: 'Invalid channel ID format' });
    }
    
    const channel = await Channel.findOne({
      _id: channelId,
      userId: req.session.userId
    });
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    res.json(channel);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update channel
router.put('/:id', requireAuth, async (req, res) => {
  try {
    let channelId = req.params.id.replace(/[{}]/g, '').trim();
    
    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(channelId)) {
      return res.status(400).json({ message: 'Invalid channel ID format' });
    }
    
    console.log('Updating channel:', channelId);
    console.log('Update data received:', req.body);
    const { name, description, fields, isPublic, isPrivate } = req.body;
    
    // Prepare update object
    const updateData = { name, description, fields };
    console.log('Prepared update data:', updateData);
    
    // Handle privacy settings - ensure they are always opposite of each other
    if (isPrivate !== undefined) {
      updateData.isPrivate = Boolean(isPrivate);
      updateData.isPublic = !Boolean(isPrivate);
    } else if (isPublic !== undefined) {
      updateData.isPublic = Boolean(isPublic);
      updateData.isPrivate = !Boolean(isPublic);
    }
    
    console.log('Final update data:', updateData);
    const channel = await Channel.findOneAndUpdate(
      { _id: channelId, userId: req.session.userId },
      updateData,
      { new: true }
    );
    
    if (!channel) {
      console.log('Channel not found for update');
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    console.log('Channel updated successfully:', channel._id);
    res.json(channel);
  } catch (error) {
    console.error('Error updating channel:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete channel
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    let channelId = req.params.id.replace(/[{}]/g, '').trim();
    
    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(channelId)) {
      return res.status(400).json({ message: 'Invalid channel ID format' });
    }
    
    const channel = await Channel.findOneAndDelete({
      _id: channelId,
      userId: req.session.userId
    });
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    // Delete all data for this channel
    await Data.deleteMany({ channelId: channelId });
    
    res.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate read API key
router.post('/:id/generate-read-key', requireAuth, async (req, res) => {
  try {
    let channelId = req.params.id.replace(/[{}]/g, '').trim();
    
    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(channelId)) {
      return res.status(400).json({ message: 'Invalid channel ID format' });
    }
    
    const channel = await Channel.findOne({ 
      _id: channelId, 
      userId: req.session.userId 
    });

    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Generate new read API key (ensure uniqueness)
    let readApiKey;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      readApiKey = crypto.randomBytes(16).toString('hex');
      
      // Check if this key already exists
      const existingChannel = await Channel.findOne({ readApiKey: readApiKey });
      if (!existingChannel) {
        break; // Key is unique
      }
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      return res.status(500).json({ message: 'Failed to generate unique read API key' });
    }
    
    // Update the channel with the new read API key
    const updatedChannel = await Channel.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { readApiKey: readApiKey },
      { new: true }
    );

    if (!updatedChannel) {
      return res.status(404).json({ message: 'Failed to update channel' });
    }

    res.json({ readApiKey });
  } catch (error) {
    console.error('Error generating read API key:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export channel data
router.get('/:id/feeds', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const format = req.query.format || 'json';
    const channel = await Channel.findOne({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });

    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const Data = require('../models/Data');
    const feeds = await Data.find({ channelId: req.params.id }).sort({ createdAt: -1 });

    if (format === 'csv') {
      // Convert to CSV
      let csv = 'Date,Field1,Field2,Field3,Field4,Field5,Field6,Field7,Field8\n';
      feeds.forEach(feed => {
        csv += `${feed.createdAt},${feed.field1 || ''},${feed.field2 || ''},${feed.field3 || ''},${feed.field4 || ''},${feed.field5 || ''},${feed.field6 || ''},${feed.field7 || ''},${feed.field8 || ''}\n`;
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="channel_${req.params.id}_data.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.json({ channel, feeds });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Import channel data
router.post('/:id/import', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const channel = await Channel.findOne({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });

    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // This would require multer middleware for file upload
    // For now, return a placeholder response
    res.json({ 
      message: 'Import functionality requires file upload middleware',
      count: 0 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
