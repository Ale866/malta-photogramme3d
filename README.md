# Malta Photogramme3D

Malta Photogramme3D is a full-stack photogrammetry platform for collecting image or video datasets, reconstructing 3D models, and placing approved results inside an interactive island scene.

The project combines:

- a Vue 3 frontend for browsing the island, uploading datasets, inspecting reconstructions, and voting on models
- an Express + TypeScript backend for authentication, uploads, model metadata, job tracking, and realtime updates
- a background worker that processes queued reconstruction jobs through a photogrammetry pipeline

## Features

- Upload photos or videos for 3D reconstruction
- Place submitted models on the island
- Track reconstruction jobs in realtime
- Inspect completed models in the web app
- Vote on models to support collaborative curation
- User accounts with login, registration, refresh sessions, and password reset flows

## Repository Layout

```text
.
|-- backend/    Express API, worker, persistence, reconstruction pipeline
|-- frontend/   Vue 3 + Vite client, island view, upload and evaluation UI
|-- package.json
```

## Tech Stack

- Frontend: Vue 3, Vite, TypeScript, Three.js, Socket.IO client
- Backend: Express, TypeScript, Mongoose, Socket.IO, Multer, Nodemailer
- Reconstruction pipeline: COLMAP, OpenMVS, FFmpeg, optional Blender-assisted conversion
- Database: MongoDB

## Core Workflow

1. A user captures a photo set or video around a real-world subject.
2. The frontend uploads that dataset and assigns a position on the island.
3. The backend stores the submission as a model job.
4. The worker picks up queued jobs and runs the reconstruction pipeline.
5. Progress updates are pushed back to the frontend through Socket.IO.
6. Completed models can be inspected and evaluated inside the platform.

## Architecture Notes

- The frontend is responsible for island interaction, dataset submission, model browsing, and evaluation flows.
- The backend exposes upload, authentication, model, and model-job endpoints and pushes job updates through Socket.IO.
- Reconstruction is handled asynchronously by a dedicated worker, separating long-running pipeline work from the web API.

## Configuration

Environment-specific configuration and deployment secrets are intentionally not included in this repository.
