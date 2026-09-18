const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export async function uploadToCloudinary(file, onStatus = () => {}) {
  if (!file) {
    throw new Error('No file selected.')
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary is not configured. Please check your Vercel environment variables.'
    )
  }

  onStatus('Preparing upload...')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

  // Images and videos use the appropriate Cloudinary resource type.
  // Other files use auto.
  let resourceType = 'auto'

  if (file.type.startsWith('image/')) {
    resourceType = 'image'
  } else if (file.type.startsWith('video/')) {
    resourceType = 'video'
  }

  onStatus('Uploading attachment...')

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    {
      method: 'POST',
      body: formData
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.error?.message || 'Cloudinary upload failed.'
    )
  }

  onStatus('Upload complete.')

  return {
    url: data.secure_url || data.url,
    fileType: file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : 'raw',
    fileName: file.name
  }
}