const router = require('express').Router();
const Annotation = require('../models/Annotation');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

// Export annotations.csv
router.get('/:projectId/csv', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const annotations = await Annotation.find({ project: req.params.projectId });

    const rows = ['filename,object_count,x,y,w,h,class_id'];
    for (const ann of annotations) {
      if (ann.boxes.length === 0) continue;
      for (const box of ann.boxes) {
        rows.push(`${ann.filename},${ann.boxes.length},${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.w)},${Math.round(box.h)},${box.classId}`);
      }
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="annotations.csv"`);
    res.send(rows.join('\n'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export classes.txt
router.get('/:projectId/classes', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const lines = project.classes
      .sort((a, b) => a.id - b.id)
      .map(c => `${c.id} ${c.name}`);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="classes.txt"`);
    res.send(lines.join('\n'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export stats summary
router.get('/:projectId/stats', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const annotations = await Annotation.find({ project: req.params.projectId });
    const totalBoxes = annotations.reduce((sum, a) => sum + a.boxes.length, 0);
    const annotatedImages = annotations.filter(a => a.boxes.length > 0).length;

    const classCounts = {};
    for (const ann of annotations) {
      for (const box of ann.boxes) {
        classCounts[box.className] = (classCounts[box.className] || 0) + 1;
      }
    }

    res.json({
      totalImages: project.images.length,
      annotatedImages,
      totalBoxes,
      totalClasses: project.classes.length,
      classCounts
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
