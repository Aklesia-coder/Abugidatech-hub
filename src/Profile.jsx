import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  addDoc
} from 'firebase/firestore'
import { auth, db } from './firebase'
import Sidebar from './Sidebar.jsx'
import { uploadToCloudinary } from './utils/media.js'

function Profile() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [saving, setSaving] = useState(false)

  // Project Upload State
  const [projects, setProjects] = useState([])
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [projectFile, setProjectFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [uploadingProject, setUploadingProject] = useState(false)
  const [projectStatus, setProjectStatus] = useState('')
  const [projectError, setProjectError] = useState('')
  const [permissionWarning, setPermissionWarning] = useState(false)
  const [copiedRules, setCopiedRules] = useState(false)
  const [showRulesGuide, setShowRulesGuide] = useState(false)
  const [syncingCloud, setSyncingCloud] = useState(false)

  const RECOMMENDED_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(RECOMMENDED_RULES)
      setCopiedRules(true)
      setTimeout(() => setCopiedRules(false), 2500)
    } catch {
      setCopiedRules(true)
      setTimeout(() => setCopiedRules(false), 2500)
    }
  }

  const getLocalProjects = (uid) => {
    try {
      return JSON.parse(localStorage.getItem(`abugida_projects_${uid}`) || '[]')
    } catch {
      return []
    }
  }

  const saveLocalProjects = (uid, list) => {
    try {
      localStorage.setItem(`abugida_projects_${uid}`, JSON.stringify(list))
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            setProfileData(data)
            setFullName(data.fullName || currentUser.displayName || '')
            setUsername(data.username || '')
            setBio(data.bio || '')
            setPhotoUrl(data.photoUrl || currentUser.photoURL || '')
          } else {
            const defaultData = {
              fullName: currentUser.displayName || 'Developer',
              username: currentUser.email?.split('@')[0] || 'dev',
              email: currentUser.email || '',
              points: 0,
              bio: 'Passionate developer building awesome web applications.',
              photoUrl: currentUser.photoURL || '',
              createdAt: new Date().toISOString(),
            }
            await setDoc(doc(db, 'users', currentUser.uid), defaultData)
            setProfileData(defaultData)
            setFullName(defaultData.fullName)
            setUsername(defaultData.username)
            setBio(defaultData.bio)
            setPhotoUrl(defaultData.photoUrl)
          }
        } catch (err) {
          console.error('Error fetching user document:', err)
        }
      } else {
        setProfileData(null)
        setProjects([])
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'projects'), where('userId', '==', user.uid))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        
        // Remove local items that have already been uploaded to firestore
        const currentLocals = getLocalProjects(user.uid).filter(
          (loc) => !firestoreList.some((f) => f.title === loc.title && f.createdAt === loc.createdAt)
        )
        saveLocalProjects(user.uid, currentLocals)

        const merged = [...currentLocals, ...firestoreList].sort((a, b) =>
          (b.createdAt || '').localeCompare(a.createdAt || '')
        )
        setProjects(merged)
        setPermissionWarning(false)
      },
      (err) => {
        console.warn('Projects snapshot error (using local storage fallback):', err)
        if (err?.code === 'permission-denied' || err?.message?.toLowerCase().includes('permission')) {
          setPermissionWarning(true)
          setProjects(getLocalProjects(user.uid))
        }
      }
    )
    return () => unsubscribe()
  }, [user])

  const handleProfileSave = async (e) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    try {
      const updatedData = {
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        photoUrl: photoUrl.trim(),
      }

      await setDoc(doc(db, 'users', user.uid), updatedData, { merge: true })
      setProfileData((prev) => ({ ...prev, ...updatedData }))
      setIsEditing(false)
    } catch (err) {
      console.error('Error updating profile:', err)
      alert('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleFileSelect = (file) => {
    if (!file) {
      if (filePreview?.url) URL.revokeObjectURL(filePreview.url)
      setProjectFile(null)
      setFilePreview(null)
      return
    }

    if (filePreview?.url) URL.revokeObjectURL(filePreview.url)

    setProjectFile(file)
    const url = URL.createObjectURL(file)
    const isVid = file.type.startsWith('video/')
    const isImg = file.type.startsWith('image/')
    setFilePreview({
      url,
      type: isVid ? 'video' : isImg ? 'image' : 'raw',
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(1),
    })
  }

  const handleClearFile = () => {
    if (filePreview?.url) URL.revokeObjectURL(filePreview.url)
    setProjectFile(null)
    setFilePreview(null)
  }

  const handleProjectSubmit = async (e) => {
    e.preventDefault()
    if (!projectTitle.trim() || !user) return

    setProjectError('')
    setUploadingProject(true)
    setProjectStatus('Preparing upload...')

    let fileUrl = ''
    let fileType = ''

    try {
      if (projectFile) {
        const uploadResult = await uploadToCloudinary(projectFile, (msg) => setProjectStatus(msg))
        fileUrl = uploadResult.url || ''
        fileType = uploadResult.fileType || ''
      }

      setProjectStatus('Saving project to profile...')

      const projectPayload = {
        userId: user.uid,
        authorName: profileData?.fullName || user.displayName || 'Member',
        title: projectTitle.trim(),
        description: projectDesc.trim(),
        fileUrl: fileUrl || '',
        fileType: fileType || '',
        likes: [],
        createdAt: new Date().toISOString(),
      }

      try {
        await addDoc(collection(db, 'projects'), projectPayload)

        // Award 10 points for sharing a project
        await setDoc(
          doc(db, 'users', user.uid),
          { points: increment(10) },
          { merge: true }
        )
        setProfileData((prev) => ({ ...prev, points: (prev?.points ?? 0) + 10 }))
      } catch (dbErr) {
        const isPerm =
          dbErr?.code === 'permission-denied' ||
          dbErr?.message?.toLowerCase().includes('permission') ||
          dbErr?.message?.toLowerCase().includes('missing or insufficient')

        if (isPerm) {
          console.warn('Firestore rejected project upload due to security rules; saving locally:', dbErr)
          setPermissionWarning(true)

          const localProj = {
            id: 'local_' + Date.now(),
            ...projectPayload,
            isLocalOnly: true,
          }

          const existingLocals = getLocalProjects(user.uid)
          const updatedLocals = [localProj, ...existingLocals]
          saveLocalProjects(user.uid, updatedLocals)

          setProjects((prev) => [localProj, ...prev])
          setProfileData((prev) => ({ ...prev, points: (prev?.points ?? 0) + 10 }))

          setProjectTitle('')
          setProjectDesc('')
          setProjectFile(null)
          setFilePreview(null)
          setShowProjectForm(false)
          setProjectStatus('')
          setUploadingProject(false)
          return
        }
        throw dbErr
      }

      // Reset form
      setProjectTitle('')
      setProjectDesc('')
      handleClearFile()
      setShowProjectForm(false)
      setProjectStatus('')
    } catch (err) {
      console.warn('Project upload failed:', err)
      setProjectError(err.message || 'Failed to upload project. Please check your connection and try again.')
    } finally {
      setUploadingProject(false)
      setProjectStatus('')
    }
  }

  const handleProjectDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return
    if (projectId.startsWith('local_')) {
      const currentLocals = getLocalProjects(user?.uid).filter((p) => p.id !== projectId)
      saveLocalProjects(user?.uid, currentLocals)
      setProjects((prev) => prev.filter((p) => p.id !== projectId))
      return
    }
    try {
      await deleteDoc(doc(db, 'projects', projectId))
    } catch (err) {
      console.warn('Error deleting project:', err)
      if (err?.code === 'permission-denied' || err?.message?.toLowerCase().includes('permission')) {
        setPermissionWarning(true)
      }
    }
  }

  const handleSyncLocalProjects = async () => {
    if (!user || syncingCloud) return
    setSyncingCloud(true)
    try {
      const localList = getLocalProjects(user.uid)
      if (localList.length === 0) {
        setSyncingCloud(false)
        return
      }

      const remaining = []
      for (const proj of localList) {
        try {
          await addDoc(collection(db, 'projects'), {
            userId: proj.userId,
            authorName: proj.authorName,
            title: proj.title,
            description: proj.description,
            fileUrl: proj.fileUrl || '',
            fileType: proj.fileType || '',
            likes: proj.likes || [],
            createdAt: proj.createdAt || new Date().toISOString(),
          })
        } catch (e) {
          console.warn('Sync failed for item:', e)
          remaining.push(proj)
        }
      }

      saveLocalProjects(user.uid, remaining)
      if (remaining.length === 0) {
        setPermissionWarning(false)
      }
    } catch (err) {
      console.warn('Error syncing projects:', err)
    } finally {
      setSyncingCloud(false)
    }
  }

  const handleLikeToggle = async (project) => {
    if (!user) return
    const projectRef = doc(db, 'projects', project.id)
    const hasLiked = project.likes?.includes(user.uid)

    try {
      if (hasLiked) {
        await deleteDoc(doc(db, 'projects', project.id))
      } else {
        await setDoc(projectRef, { likes: arrayUnion(user.uid) }, { merge: true })
      }
    } catch (err) {
      console.error('Error toggling like:', err)
      if (err?.code === 'permission-denied' || err?.message?.toLowerCase().includes('permission')) {
        setPermissionWarning(true)
      }
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-[#0a0a14] text-white">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-400">Loading Profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen bg-[#0a0a14] text-white">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-purple-900/40 border border-purple-800 flex items-center justify-center text-3xl mx-auto mb-4">
              👤
            </div>
            <h2 className="text-xl font-bold mb-2">Sign in to view your profile</h2>
            <p className="text-sm text-gray-400 mb-6">
              Track your learning points, share coding projects, and build your developer portfolio.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-lg w-full"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0a0a14] text-gray-900 dark:text-white transition-colors duration-300">
      <Sidebar />

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-20 md:pb-8">
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-[#121124] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-6 sm:p-8 mb-8 max-w-2xl shadow-sm relative overflow-hidden">
          {/* Top subtle decorative gradient */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={fullName || 'Avatar'}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500 shadow-md shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-purple-100 dark:bg-purple-900/50 border-2 border-purple-300 dark:border-purple-700 flex items-center justify-center text-3xl font-bold text-purple-700 dark:text-purple-300 shadow-md shrink-0">
                  {(fullName || 'U').charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  {profileData?.fullName || user.displayName || 'Developer'}
                </h1>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  @{profileData?.username || user.email?.split('@')[0]}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-300 dark:border-amber-800">
                  <span>🏆</span>
                  <span>{profileData?.points ?? 0} Points</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-semibold px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
              <button
                onClick={handleSignOut}
                className="text-xs font-semibold px-4 py-2 rounded-xl border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Bio text */}
          {!isEditing && profileData?.bio && (
            <p className="mt-5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed pt-4 border-t border-gray-100 dark:border-gray-800/80">
              {profileData.bio}
            </p>
          )}

          {/* Edit Profile Form */}
          {isEditing && (
            <form onSubmit={handleProfileSave} className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#1b1830] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#1b1830] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Profile Photo URL (optional)
                </label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-gray-50 dark:bg-[#1b1830] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Bio
                </label>
                <textarea
                  rows="3"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#1b1830] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Tell others what you love coding..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs font-semibold px-4 py-2 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="text-xs font-semibold px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Projects Section */}
        <div className="max-w-2xl">
          {/* Firestore Rules Warning / Helper Banner */}
          {permissionWarning && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-2xl p-5 mb-6 text-amber-900 dark:text-amber-200 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <h3 className="font-bold text-sm text-amber-900 dark:text-amber-100">
                    Firebase Security Rules Update Needed
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPermissionWarning(false)}
                  className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-950 dark:hover:text-white p-1 rounded font-bold"
                  title="Dismiss warning"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-amber-800 dark:text-amber-300 mb-3 leading-relaxed">
                Your Firebase project (<strong>abugidatech-hub</strong>) has security rules that currently reject reading or uploading projects (<code>permission-denied</code>). Update your Firestore rules in the Firebase Console to enable project sharing.
              </p>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={handleCopyRules}
                  className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
                >
                  {copiedRules ? '✓ Copied to Clipboard!' : '📋 Copy Recommended Rules'}
                </button>

                <a
                  href="https://console.firebase.google.com/project/abugidatech-hub/firestore/rules"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold bg-white dark:bg-[#1f1a14] hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5"
                >
                  ↗ Open Firebase Console
                </a>

                <button
                  type="button"
                  onClick={() => setShowRulesGuide(!showRulesGuide)}
                  className="text-xs font-medium text-amber-800 dark:text-amber-300 underline hover:text-amber-950 dark:hover:text-amber-100 px-1"
                >
                  {showRulesGuide ? 'Hide instructions' : 'View instructions'}
                </button>
              </div>

              {showRulesGuide && (
                <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800/60 text-xs">
                  <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-300 mb-3">
                    <li>Open <strong>Firebase Console</strong> → select <strong>abugidatech-hub</strong>.</li>
                    <li>Click <strong>Firestore Database</strong> in the left menu, then click the <strong>Rules</strong> tab.</li>
                    <li>Replace the contents with the rules below and click <strong>Publish</strong>.</li>
                  </ol>
                  <pre className="bg-amber-100/70 dark:bg-black/40 p-3 rounded-lg overflow-x-auto text-[11px] font-mono text-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-900">
                    {RECOMMENDED_RULES}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">My Projects</h2>
                {projects.filter((p) => p.isLocalOnly).length > 0 && (
                  <span className="text-[11px] bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full">
                    {projects.filter((p) => p.isLocalOnly).length} local
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showcase your coding projects and assignments
              </p>
            </div>

            <div className="flex items-center gap-2">
              {projects.filter((p) => p.isLocalOnly).length > 0 && (
                <button
                  type="button"
                  onClick={handleSyncLocalProjects}
                  disabled={syncingCloud}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-2 rounded-lg transition inline-flex items-center gap-1 shadow-xs disabled:opacity-50"
                >
                  {syncingCloud ? 'Syncing...' : '🔄 Sync to Cloud'}
                </button>
              )}
              <button
                onClick={() => {
                  setShowProjectForm(!showProjectForm)
                  setProjectError('')
                }}
                className="text-sm bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
              >
                {showProjectForm ? '✕ Close' : '+ Add Project'}
              </button>
            </div>
          </div>

          {/* Project Upload Form */}
          {showProjectForm && (
            <form
              onSubmit={handleProjectSubmit}
              className="bg-white dark:bg-[#121124] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6 shadow-sm flex flex-col gap-4"
            >
              <h3 className="font-bold text-sm">Add New Project to Portfolio</h3>

              {projectError && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs">
                  {projectError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Portfolio Website, Calculator, Chat App"
                  className="w-full bg-gray-50 dark:bg-[#1b1830] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="What does it do? Technologies used..."
                  className="w-full bg-gray-50 dark:bg-[#1b1830] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Attach Screenshot, Video or Demo File
                </label>
                <input
                  type="file"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  className="text-xs text-gray-500 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 dark:file:bg-purple-950/60 file:text-purple-600 dark:file:text-purple-400 hover:file:bg-purple-100 cursor-pointer"
                  accept="image/*,video/*,.pdf,.zip"
                />

                {filePreview && (
                  <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-[#1b1830] border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 min-w-0">
                      {filePreview.type === 'image' && (
                        <img
                          src={filePreview.url}
                          alt="Preview"
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      {filePreview.type === 'video' && <span className="text-xl">🎬</span>}
                      {filePreview.type === 'raw' && <span className="text-xl">📁</span>}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{filePreview.name}</p>
                        <p className="text-[10px] text-gray-400">{filePreview.size} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  {projectStatus}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProjectForm(false)}
                    className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingProject || !projectTitle.trim()}
                    className="text-xs font-semibold px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {uploadingProject ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      'Save Project (+10 pts)'
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Project List */}
          {projects.length === 0 ? (
            <div className="bg-white dark:bg-[#121124] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center text-gray-400">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl mx-auto mb-3">
                📂
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                No projects added yet
              </p>
              <p className="text-xs max-w-sm mx-auto mb-4">
                Share what you are building to earn points and showcase your work to the community!
              </p>
              <button
                onClick={() => setShowProjectForm(true)}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-xl transition"
              >
                + Add Your First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white dark:bg-[#121124] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs hover:border-purple-300 dark:hover:border-purple-900 transition flex flex-col justify-between group"
                >
                  {project.fileUrl && project.fileType === 'image' && (
                    <div className="h-36 bg-gray-100 dark:bg-black/40 overflow-hidden">
                      <img
                        src={project.fileUrl}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {project.fileUrl && project.fileType === 'video' && (
                    <div className="h-36 bg-black overflow-hidden flex items-center justify-center">
                      <video
                        src={project.fileUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {project.isLocalOnly && (
                        <span className="inline-block text-[10px] bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full mb-1.5 border border-amber-300/80 dark:border-amber-800/60">
                          📱 Saved on this device
                        </span>
                      )}
                      <p className="font-bold text-base mb-1 text-gray-900 dark:text-white break-words">{project.title}</p>
                      {project.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 whitespace-pre-line break-words">
                          {project.description}
                        </p>
                      )}

                      {project.fileUrl && project.fileType === 'raw' && (
                        <a
                          href={project.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-xs text-purple-600 dark:text-purple-400 hover:underline mb-3 break-all"
                        >
                          📎 View Attached Document
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800/80 text-xs text-gray-400">
                      <button
                        onClick={() => handleLikeToggle(project)}
                        className="flex items-center gap-1 hover:text-red-500 transition"
                      >
                        <span>{project.likes?.includes(user.uid) ? '❤️' : '🤍'}</span>
                        <span className="font-semibold">{project.likes?.length || 0}</span>
                      </button>

                      <button
                        onClick={() => handleProjectDelete(project.id)}
                        className="text-red-500 hover:text-red-700 font-medium transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile