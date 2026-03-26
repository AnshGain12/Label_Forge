# LabelForge

A full-stack data annotation platform built with **MongoDB, Express, React, Node.js**.  
Annotate images with bounding boxes, manage projects, define object classes, and export AI-ready training data.

---

## Features

- **Auth** — JWT-based register/login with secure sessions
- **Projects** — Create, edit, delete projects with image uploads
- **Interactive Canvas** — Draw bounding boxes with zoom, pan, class labeling
- **Persistent Storage** — All annotations saved to MongoDB, accessible any time
- **Export** — `annotations.csv` (filename, object_count, x, y, w, h, class_id) and `classes.txt` (id name)
- **Keyboard Shortcuts** — D/S/P for tools, Delete to remove, Arrow keys to navigate images

---

## Project Structure

```
annotation-system/
├── backend/               # Express + MongoDB API
│   ├── models/            # Mongoose schemas (User, Project, Annotation)
│   ├── routes/            # auth, projects, annotations, export
│   ├── middleware/        # JWT auth
│   ├── uploads/           # Uploaded images (auto-created)
│   ├── server.js
│   └── .env
└── frontend/              # React SPA
    └── src/
        ├── components/
        │   ├── Auth/       # Login & Register
        │   ├── Dashboard/  # Project list
        │   ├── Project/    # Image + class management
        │   └── Annotation/ # Canvas annotation tool
        ├── context/        # AuthContext
        └── styles.css      # Global design tokens
```

---

## Quick Start

### Prerequisites
- Node.js >= 16
- MongoDB (local or MongoDB Atlas)

### 1. Backend

```bash
cd backend
npm install

# Edit .env with your values:
# MONGO_URI=mongodb://localhost:27017/annotationdb
# JWT_SECRET=your_secret_key
# PORT=5000

npm start
# or: npm run dev  (requires nodemon)
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
# Opens at http://localhost:3000
# Proxies /api requests to localhost:5000
```

---

## Docker Compose (optional)

```yaml
version: '3.8'
services:
  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - MONGO_URI=mongodb://mongo:27017/annotationdb
      - JWT_SECRET=change_this_in_production
    depends_on:
      - mongo
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:5000
    depends_on:
      - backend

volumes:
  mongo_data:
```

---

## Export Formats

### annotations.csv
```
filename,object_count,x,y,w,h,class_id
image1.jpg,2,120,80,200,150,0
image1.jpg,2,300,100,80,60,1
```

### classes.txt
```
0 car
1 person
2 bicycle
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| GET | /api/projects | List user's projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project |
| PUT | /api/projects/:id | Update project/classes |
| DELETE | /api/projects/:id | Delete project |
| POST | /api/projects/:id/images | Upload images |
| DELETE | /api/projects/:id/images/:imgId | Remove image |
| GET | /api/annotations/:projectId | All annotations |
| GET | /api/annotations/:projectId/:imageId | Single image annotations |
| POST | /api/annotations/:projectId/:imageId | Save annotations |
| GET | /api/export/:projectId/csv | Download annotations.csv |
| GET | /api/export/:projectId/classes | Download classes.txt |
| GET | /api/export/:projectId/stats | Annotation statistics |

---

## Canvas Keyboard Shortcuts

| Key | Action |
|-----|--------|
| D | Draw mode |
| S | Select mode |
| P | Pan mode |
| Delete / Backspace | Remove selected box |
| ← / → | Previous / Next image |
| Scroll | Zoom in/out |

---

## Environment Variables

### Backend `.env`
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/annotationdb
JWT_SECRET=your_super_secret_key
CLIENT_URL=http://localhost:3000
```
