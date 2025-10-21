const express = require('express');
const Channel = require('../models/Channel');
const Data = require('../models/Data');
const router = express.Router();

// Middleware to check authentication for protected routes
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Add data to channel via GET (for simple IoT devices)
router.get('/update', async (req, res) => {
  try {
    const { api_key, field1, field2, field3, field4, field5, field6, field7, field8, lat, lon, elevation, status } = req.query;
    
    if (!api_key) {
      return res.status(400).json({ message: 'API key is required' });
    }
    
    // Find channel by API key (check both writeApiKey and apiKey for compatibility)
    const channel = await Channel.findOne({ 
      $or: [
        { writeApiKey: api_key },
        { apiKey: api_key }
      ]
    });
    if (!channel) {
      return res.status(404).json({ message: 'Invalid API key' });
    }
    
    // Create new data entry
    const dataEntry = new Data({
      channelId: channel._id,
      field1: field1 ? parseFloat(field1) : undefined,
      field2: field2 ? parseFloat(field2) : undefined,
      field3: field3 ? parseFloat(field3) : undefined,
      field4: field4 ? parseFloat(field4) : undefined,
      field5: field5 ? parseFloat(field5) : undefined,
      field6: field6 ? parseFloat(field6) : undefined,
      field7: field7 ? parseFloat(field7) : undefined,
      field8: field8 ? parseFloat(field8) : undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lon: lon ? parseFloat(lon) : undefined,
      elevation: elevation ? parseFloat(elevation) : undefined,
      status: status
    });
    
    await dataEntry.save();
    
    // Update channel's last entry time
    await Channel.findByIdAndUpdate(channel._id, { lastEntry: new Date() });
    
    res.json({ 
      success: true, 
      entry_id: dataEntry._id,
      created_at: dataEntry.createdAt 
    });
  } catch (error) {
    console.error('Error adding data via GET:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add data to channel (public endpoint for IoT devices)
router.post('/update', async (req, res) => {
  try {
    const { api_key, field1, field2, field3, field4, field5, field6, field7, field8, lat, lon, elevation, status } = req.body;
    
    if (!api_key) {
      return res.status(400).json({ message: 'API key is required' });
    }
    
    // Find channel by API key (check both writeApiKey and apiKey for compatibility)
    const channel = await Channel.findOne({ 
      $or: [
        { writeApiKey: api_key },
        { apiKey: api_key }
      ]
    });
    if (!channel) {
      return res.status(404).json({ message: 'Invalid API key' });
    }
    
    // Create new data entry
    const dataEntry = new Data({
      channelId: channel._id,
      field1: field1 ? parseFloat(field1) : undefined,
      field2: field2 ? parseFloat(field2) : undefined,
      field3: field3 ? parseFloat(field3) : undefined,
      field4: field4 ? parseFloat(field4) : undefined,
      field5: field5 ? parseFloat(field5) : undefined,
      field6: field6 ? parseFloat(field6) : undefined,
      field7: field7 ? parseFloat(field7) : undefined,
      field8: field8 ? parseFloat(field8) : undefined,
      latitude: lat ? parseFloat(lat) : undefined,
      longitude: lon ? parseFloat(lon) : undefined,
      elevation: elevation ? parseFloat(elevation) : undefined,
      status: status
    });
    
    await dataEntry.save();
    
    // Update channel's last entry time
    channel.lastEntry = new Date();
    await channel.save();
    
    res.json({ message: 'Data updated successfully', entryId: dataEntry._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get channel data
router.get('/channels/:channelId', async (req, res) => {
  try {
    let { channelId } = req.params;
    const { results = 100, start, end, read_api_key } = req.query;
    
    // Clean up channelId - remove any curly braces or extra characters
    channelId = channelId.replace(/[{}]/g, '').trim();
    
    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(channelId)) {
      return res.status(400).json({ message: 'Invalid channel ID format' });
    }
    
    let channel;
    
    // Check if using read API key or session authentication
    if (read_api_key) {
      // Public access with read API key
      channel = await Channel.findOne({
        _id: channelId,
        readApiKey: read_api_key
      });
      if (!channel) {
        return res.status(401).json({ message: 'Invalid read API key' });
      }
    } else {
      // Authenticated access (requires login)
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Authentication required or provide read_api_key' });
      }
      
      channel = await Channel.findOne({
        _id: channelId,
        userId: req.session.userId
      });
      if (!channel) {
        return res.status(404).json({ message: 'Channel not found or access denied' });
      }
    }
    
    // Build query
    let query = { channelId };
    if (start || end) {
      query.createdAt = {};
      if (start) query.createdAt.$gte = new Date(start);
      if (end) query.createdAt.$lte = new Date(end);
    }
    
    // Get data
    const data = await Data.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(results));
    
    res.json({
      channel: {
        id: channel._id,
        name: channel.name,
        description: channel.description,
        fields: channel.fields
      },
      feeds: data.reverse() // Return in chronological order
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get specific field data
router.get('/channels/:channelId/fields/:fieldNumber', async (req, res) => {
  try {
    let { channelId, fieldNumber } = req.params;
    const { results = 100, start, end } = req.query;
    
    // Clean up channelId - remove any curly braces or extra characters
    channelId = channelId.replace(/[{}]/g, '').trim();
    
    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(channelId)) {
      return res.status(400).json({ message: 'Invalid channel ID format' });
    }
    
    // Find channel
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    // Build query
    let query = { channelId };
    if (start || end) {
      query.createdAt = {};
      if (start) query.createdAt.$gte = new Date(start);
      if (end) query.createdAt.$lte = new Date(end);
    }
    
    // Get data with only the specific field
    const fieldName = `field${fieldNumber}`;
    const data = await Data.find(query)
      .select(`${fieldName} createdAt`)
      .sort({ createdAt: -1 })
      .limit(parseInt(results));
    
    res.json({
      channel: {
        id: channel._id,
        name: channel.name,
        field: fieldNumber
      },
      feeds: data.reverse().map(item => ({
        created_at: item.createdAt,
        [fieldName]: item[fieldName]
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
