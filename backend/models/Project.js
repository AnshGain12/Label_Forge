const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  id:    { type: Number, required: true },
  name:  { type: String, required: true, trim: true },
  color: { type: String, default: '#FF6B6B' }
});

const imageSchema = new mongoose.Schema({
  filename:    { type: String, required: true },
  originalName:{ type: String, required: true },
  path:        { type: String, required: true },
  size:        { type: Number },
  width:       { type: Number },
  height:      { type: Number },
  uploadedAt:  { type: Date, default: Date.now }
});

const projectSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  classes:     [classSchema],
  images:      [imageSchema],
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

projectSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Project', projectSchema);
