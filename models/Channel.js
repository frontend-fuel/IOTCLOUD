const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true
  },
  writeApiKey: {
    type: String,
    required: true,
    unique: true
  },
  readApiKey: {
    type: String,
    unique: true,
    sparse: true
  },
  isPrivate: {
    type: Boolean,
    default: true
  },
  fields: [{
    name: String,
    label: String
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastEntry: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('Channel', channelSchema);
