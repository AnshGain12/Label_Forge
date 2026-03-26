const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Project = require('../models/Project');
const Annotation = require('../models/Annotation');
const auth = require('../middleware/auth');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads', req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|bmp|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Images only'));
  }
});

// GET all projects for user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id }).sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE project
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Project name required' });
    const project = await Project.create({ name, description, owner: req.user._id, classes: [], images: [] });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE project (name, description, classes)
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const { name, description, classes } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (classes) project.classes = classes;
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Remove uploaded files
    const dir = path.join(__dirname, '../uploads', req.params.id);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });

    await Annotation.deleteMany({ project: req.params.id });
    await project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPLOAD images to project
router.post('/:id/images', auth, upload.array('images', 50), async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const newImages = req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      path: `/uploads/${req.params.id}/${f.filename}`,
      size: f.size
    }));

    project.images.push(...newImages);
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE image from project
router.delete('/:id/images/:imageId', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const img = project.images.id(req.params.imageId);
    if (!img) return res.status(404).json({ message: 'Image not found' });

    const filePath = path.join(__dirname, '..', img.path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await Annotation.deleteOne({ project: req.params.id, imageId: req.params.imageId });
    project.images.pull(req.params.imageId);
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
