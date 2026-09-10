import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import {
  doc, getDoc, updateDoc, collection, addDoc, query, where,
  onSnapshot, deleteDoc, arrayUnion, arrayRemove
} from 'firebase/firestore'
import { auth, db } from './firebase'
import Sidebar from './Sidebar.jsx'

const CLOUDINARY_CLOUD_NAME = 'z6rnow5n'
const CLOUDINARY_UPLOAD_PRESET = 'abugidatech_uploads'

function Profile() {
  const [user, setUser] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [bio, setBio] = useState('')
  const [editingBio, setEditingBio] = useState(false)
  const [savingBio, setSavingBio] = useState(false)

  const [projects, setProjects] = useState([])
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [projectFile, setProjectFile] = useState(null)
  const [uploadingProject, setUploadingProject] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
        if (userDoc.exists()) {
          setProfileData(userDoc.data())
          setBio(userDoc.data().bio || '')
        }
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'projects'), where('userId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      setProjects(list)
    })
    return () => unsubscribe()
  }, [user])

  const uploadToCloudinary = async (file, resourceType) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
      { method: 'POST', body: formData }
    )
    const data = await res.json()
    return data.secure_url
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !user) return

    setUploadingPhoto(true)
    try {
      const url = await uploadToCloudinary(file, 'image')
      await updateDoc(doc(db, 'users', user.uid), { photoUrl: url })
      setProfileData((prev) => ({ ...prev, photoUrl: url }))
    } catch (err) {
      console.error('Photo upload failed:', err)
    }
    setUploadingPhoto(false)
  }

  const handlePhotoDelete = async () => {
    if (!user) return
    await updateDoc(doc(db, 'users', user.uid), { photoUrl: '' })
    setProfileData((prev) => ({ ...prev, photoUrl: '' }))
  }

  const handleBioSave = async () => {
    if (!user) return
    setSavingBio(true)
    await updateDoc(doc(db, 'users', user.uid), { bio })
    setProfileData((prev) => ({ ...prev, bio }))
    setSavingBio(false)
    setEditingBio(false)
  }

  const handleProjectSubmit = async (e) => {
    e.preventDefault()
    if (!projectTitle.trim() || !user) return

    setUploadingProject(true)
    try {
      let fileUrl = ''
      let fileType = ''
      if (projectFile) {
        fileType = projectFile.type.startsWith('video/') ? 'video' : 'image'
        const resourceType = fileType === 'video' ? 'video' : 'image'
        fileUrl = await uploadToCloudinary(projectFile, resourceType)
      }

      await addDoc(collection(db, 'projects'), {
        userId: user.uid,
        authorName: user.displayName || 'Member',
        title: projectTitle.trim(),
        description: projectDesc.trim(),
        fileUrl,
        fileType,
        likes: [],
        createdAt: new Date().toISOString(),
      })

      setProjectTitle('')
      setProjectDesc('')
      setProjectFile(null)
      setShowProjectForm(false)
    } catch (err) {
      console.error('Project upload failed:', err)
    }
    setUploadingProject(false)
  }

  const handleProjectDelete = async (projectId) => {
    await deleteDoc(doc(db, 'projects', projectId))
  }

  const handleLikeToggle = async (project) => {
    if (!user) return
    const projectRef = doc(db, 'projects', project.id)
    const hasLiked = project.likes?.includes(user.uid)

    if (hasLiked) {
      await updateDoc(projectRef, { likes: arrayRemove(user.uid) })
    } else {
      await updateDoc(projectRef, { likes: arrayUnion(user.uid) })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white dark:bg-[#0a0a14] text-gray-900 dark:text-white">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0a0a14] transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 px-6 md:px-12 py-10 pb-24 md:pb-10 text-gray-900 dark:text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">My Profile</h1>

        {/* Profile Card */}
        <div className="max-w-md bg-purple-50 dark:bg-[#12101f] border border-purple-200 dark:border-purple-900 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              {profileData?.photoUrl ? (
                <img
                  src={profileData.photoUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-purple-200 dark:bg-purple-900/40 flex items-center justify-center text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {(profileData?.fullName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-bold text-lg">{profileData?.fullName || 'User'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                @{profileData?.username || 'username'}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-5">
            <label className="cursor-pointer text-sm bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-2 rounded-lg transition">
              {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
            {profileData?.photoUrl && (
              <button
                onClick={handlePhotoDelete}
                className="text-sm border border-red-400 text-red-500 font-semibold px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              >
                Remove
              </button>
            )}
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Bio</p>
            {editingBio ? (
              <div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell the community about yourself..."
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a0a14] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <button
                  onClick={handleBioSave}
                  disabled={savingBio}
                  className="mt-2 text-sm bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  {savingBio ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {profileData?.bio || 'No bio yet.'}
                </p>
                <button
                  onClick={() => setEditingBio(true)}
                  className="text-xs text-purple-600 dark:text-purple-400 font-semibold whitespace-nowrap"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 text-sm border-t border-gray-200 dark:border-gray-800 pt-4">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Points</span>
              <span className="text-purple-600 dark:text-purple-400 font-semibold">
                {profileData?.points ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Email</span>
              <span className="text-gray-800 dark:text-gray-200">{profileData?.email}</span>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">My Projects</h2>
            <button
              onClick={() => setShowProjectForm(!showProjectForm)}
              className="text-sm bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg transition"
            >
              {showProjectForm ? 'Cancel' : '+ Add Project'}
            </button>
          </div>

          {showProjectForm && (
            <form
              onSubmit={handleProjectSubmit}
              className="bg-purple-50 dark:bg-[#12101f] border border-purple-200 dark:border-purple-900 rounded-xl p-5 mb-6 flex flex-col gap-3"
            >
              <input
                type="text"
                placeholder="Project title"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                required
                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a0a14] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <textarea
                placeholder="Describe your project..."
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                rows={2}
                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a0a14] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <label className="text-sm text-purple-600 dark:text-purple-400 cursor-pointer">
                📎 {projectFile ? projectFile.name : 'Attach image or video (optional)'}
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setProjectFile(e.target.files[0])}
                  className="hidden"
                />
              </label>
              <button
                type="submit"
                disabled={uploadingProject}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
              >
                {uploadingProject ? 'Uploading...' : 'Post Project'}
              </button>
            </form>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {projects.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 col-span-2">
                No projects yet. Share what you've built!
              </p>
            )}
            {projects.map((project) => {
              const hasLiked = project.likes?.includes(user?.uid)
              return (
                <div
                  key={project.id}
                  className="bg-white dark:bg-[#151225] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
                >
                  {project.fileType === 'image' && (
                    <img src={project.fileUrl} alt={project.title} className="w-full h-40 object-cover" />
                  )}
                  {project.fileType === 'video' && (
                    <video src={project.fileUrl} controls className="w-full h-40 object-cover" />
                  )}
                  <div className="p-4">
                    <p className="font-semibold mb-1">{project.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{project.description}</p>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleLikeToggle(project)}
                        className={`text-sm font-semibold flex items-center gap-1 ${
                          hasLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {hasLiked ? '❤️' : '🤍'} {project.likes?.length || 0}
                      </button>
                      <button
                        onClick={() => handleProjectDelete(project.id)}
                        className="text-xs text-red-500 font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile