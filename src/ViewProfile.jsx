import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import {
  doc, getDoc, collection, query, where, onSnapshot,
  updateDoc, arrayUnion, arrayRemove, increment
} from 'firebase/firestore'
import { auth, db } from './firebase'
import Sidebar from './Sidebar.jsx'

function ViewProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user))
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists()) {
        setProfileData(userDoc.data())
      }
      setLoading(false)
    }
    loadProfile()
  }, [userId])

  useEffect(() => {
    const q = query(collection(db, 'projects'), where('userId', '==', userId))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      setProjects(list)
    })
    return () => unsubscribe()
  }, [userId])

  const handleLikeToggle = async (project) => {
    if (!currentUser) return
    const projectRef = doc(db, 'projects', project.id)
    const ownerRef = doc(db, 'users', project.userId)
    const hasLiked = project.likes?.includes(currentUser.uid)

    if (hasLiked) {
      await updateDoc(projectRef, { likes: arrayRemove(currentUser.uid) })
      await updateDoc(ownerRef, { points: increment(-5) })
    } else {
      await updateDoc(projectRef, { likes: arrayUnion(currentUser.uid) })
      await updateDoc(ownerRef, { points: increment(5) })
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

  if (!profileData) {
    return (
      <div className="flex min-h-screen bg-white dark:bg-[#0a0a14] text-gray-900 dark:text-white">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">User not found.</div>
      </div>
    )
  }

  const isOwnProfile = currentUser?.uid === userId

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0a0a14] transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 px-6 md:px-12 py-10 pb-24 md:pb-10 text-gray-900 dark:text-white">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-purple-600 dark:text-purple-400 font-semibold mb-4"
        >
          ← Back
        </button>

        <h1 className="text-2xl md:text-3xl font-bold mb-6">
          {isOwnProfile ? 'My Profile' : `${profileData.fullName}'s Profile`}
        </h1>

        <div className="max-w-md bg-purple-50 dark:bg-[#12101f] border border-purple-200 dark:border-purple-900 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            {profileData.photoUrl ? (
              <img src={profileData.photoUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-purple-200 dark:bg-purple-900/40 flex items-center justify-center text-2xl font-bold text-purple-700 dark:text-purple-300">
                {(profileData.fullName || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-bold text-lg">{profileData.fullName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">@{profileData.username}</p>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Bio</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {profileData.bio || 'No bio yet.'}
            </p>
          </div>

          <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-800 pt-4">
            <span className="text-gray-500 dark:text-gray-400">Points</span>
            <span className="text-purple-600 dark:text-purple-400 font-semibold">
              {profileData.points ?? 0}
            </span>
          </div>
        </div>

        <div className="max-w-2xl">
          <h2 className="text-xl font-bold mb-4">
            {isOwnProfile ? 'My Projects' : 'Projects'}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {projects.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 col-span-2">
                No projects shared yet.
              </p>
            )}
            {projects.map((project) => {
              const hasLiked = project.likes?.includes(currentUser?.uid)
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
                    <button
                      onClick={() => handleLikeToggle(project)}
                      className={`text-sm font-semibold flex items-center gap-1 ${
                        hasLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {hasLiked ? '❤️' : '🤍'} {project.likes?.length || 0}
                    </button>
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

export default ViewProfile