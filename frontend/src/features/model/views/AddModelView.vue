<template>
  <div class="add-model">
    <h1>Add Model</h1>

    <form @submit.prevent="submitForm">
      <div class="form-group">
        <label for="title">Title</label>
        <input id="title" v-model="title" type="text" />
      </div>

      <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop">
        <p>Drag & drop images here, or click to select files</p>
        <input type="file" multiple accept="image/*" @change="handleFileSelect" />
      </div>

      <div class="preview">
        <div v-for="(file, index) in files" :key="index" class="preview-item">
          <div class="image-wrapper">
            <img :src="file.preview" alt="preview" />
            <div class="delete-icon" @click="removeFile(index)">×</div>
          </div>
        </div>
      </div>

      <button type="submit">Submit</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, useModel } from 'vue'
import { ModelApi } from '../infrastructure/api'
import { use3dModel } from '../application/useModel'

interface UploadedFile {
  file: File
  preview: string
}

const title = ref('')
const x = ref<number | null>(null)
const y = ref<number | null>(null)
const files = ref<UploadedFile[]>([])

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files) return

  Array.from(input.files).forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      files.value.push({
        file,
        preview: e.target?.result as string
      })
    }
    reader.readAsDataURL(file)
  })

  input.value = ''
}

const removeFile = (index: number) => {
  files.value.splice(index, 1)
}

const handleDrop = (event: DragEvent) => {
  if (!event.dataTransfer?.files) return
  Array.from(event.dataTransfer.files).forEach(file => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      files.value.push({
        file,
        preview: e.target?.result as string
      })
    }
    reader.readAsDataURL(file)
  })
}

const { uploadModel } = use3dModel()

const submitForm = async () => {
  try {
    const data = await uploadModel(title.value, files.value.map(f => f.file));
    console.log('Upload response:', data);
  } catch (err) {
    console.error('Upload failed:', err);
  }
};

</script>

<style scoped>
.add-model {
  padding: 1rem;
  max-width: 460px;
  background: #1c1c1c;
  color: #fff;
  border-radius: 8px;
  font-family: sans-serif;
}

h1 {
  text-align: center;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.coordinates {
  flex-direction: row;
  gap: 1rem;
  align-items: center;
}

label {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

input[type="text"],
input[type="number"] {
  padding: 0.5rem;
  border-radius: 4px;
  border: none;
  background: #333;
  color: #fff;
}

.upload-area {
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 2px dashed #666;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
}

.upload-area input[type="file"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.preview {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.preview-item {
  width: 100px;
  position: relative;
}

.image-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

.delete-icon {
  position: absolute;
  top: -10px;
  right: -10px;
  background: black;
  color: #ff4d4d;
  font-weight: bold;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  text-align: center;
  line-height: 20px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
}

.delete-icon:hover {
  background: rgba(0, 0, 0, 0.9);
}


button {
  padding: 0.5rem 1rem;
  background: #0077ff;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
}

button:hover {
  background: #005fcc;
}
</style>
