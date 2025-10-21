const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  field1: Number,
  field2: Number,
  field3: Number,
  field4: Number,
  field5: Number,
  field6: Number,
  field7: Number,
  field8: Number,
  latitude: Number,
  longitude: Number,
  elevation: Number,
  status: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
dataSchema.index({ channelId: 1, createdAt: -1 });

module.exports = mongoose.model('Data', dataSchema);
