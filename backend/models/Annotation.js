const mongoose = require('mongoose');

const boundingBoxSchema = new mongoose.Schema({
  x:       { type: Number, required: true },
  y:       { type: Number, required: true },
  w:       { type: Number, required: true },
  h:       { type: Number, required: true },
  classId: { type: Number, required: true },
  className:{ type: String, required: true },
  color:   { type: String, default: '#FF6B6B' }
});

const annotationSchema = new mongoose.Schema({
  project:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  imageId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  filename:  { type: String, required: true },
  boxes:     [boundingBoxSchema],
  updatedAt: { type: Date, default: Date.now }
});

annotationSchema.index({ project: 1, imageId: 1 }, { unique: true });

annotationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Annotation', annotationSchema);
