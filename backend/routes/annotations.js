const router = require('express').Router();
const Annotation = require('../models/Annotation');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

// GET annotations for an image
router.get('/:projectId/:imageId', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const annotation = await Annotation.findOne({
      project: req.params.projectId,
      imageId: req.params.imageId
    });
    res.json(annotation || { boxes: [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all annotations for a project
router.get('/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const annotations = await Annotation.find({ project: req.params.projectId });
    res.json(annotations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SAVE / UPDATE annotations for an image
router.post('/:projectId/:imageId', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const image = project.images.id(req.params.imageId);
    if (!image) return res.status(404).json({ message: 'Image not found' });

    const { boxes } = req.body;

    const annotation = await Annotation.findOneAndUpdate(
      { project: req.params.projectId, imageId: req.params.imageId },
      { project: req.params.projectId, imageId: req.params.imageId, filename: image.originalName, boxes: boxes || [], updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(annotation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
