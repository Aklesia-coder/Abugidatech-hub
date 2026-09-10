import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import {
  doc, getDoc, setDoc, deleteDoc, updateDoc, collection, getDocs,
  addDoc, query, where, orderBy, onSnapshot
} from 'firebase/firestore'
import { auth, db } from './firebase'
import Sidebar from './Sidebar.jsx'

const GROUP_ID = 'web-design'
const GROUP_NAME = 'Web Development'
const GROUP_DESC = 'Learn and build websites together.'

const CLOUDINARY_CLOUD_NAME = 'z6rnow5n'
const CLOUDINARY_UPLOAD_PRESET = 'abugidatech_uploads'

function Community() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [isMember, setIsMember] = useState(false)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        await checkMembership(currentUser.uid)
        await loadMembers()
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      where('groupId', '==', GROUP_ID),
      orderBy('createdAt', 'asc')
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setPosts(postsList)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [posts])

  const checkMembership = async (uid) => {
    const memberDoc = await getDoc(doc(db, 'groupMembers', `${GROUP_ID}_${uid}`))
    setIsMember(memberDoc.exists())
  }

  const loadMembers = async () => {
    const membersSnapshot = await getDocs(collection(db, 'groupMembers'))
    const list = membersSnapshot.docs
      .map((d) => d.data())
      .filter((m) => m.groupId === GROUP_ID)
    setMembers(list)
  }

  const handleJoinToggle = async () => {
    if (!user) return
    const memberRef = doc(db, 'groupMembers', `${GROUP_ID}_${user.uid}`)

    if (isMember) {
      await deleteDoc(memberRef)
      setIsMember(false)
    } else {
      await setDoc(memberRef, {
        groupId: GROUP_ID,
        userId: user.uid,
        userName: user.displayName || 'Member',
        joinedAt: new Date().toISOString(),
      })
      setIsMember(true)
    }
    await loadMembers()
  }

  const handlePostSubmit = async (e) => {
    e.preventDefault()
    if (!newPost.trim() || !user) return

    setPosting(true)
    await addDoc(collection(db, 'posts'), {
      groupId: GROUP_ID,
      authorId: user.uid,
      authorName: user.displayName || 'Member',
      content: newPost.trim(),
      createdAt: new Date().toISOString(),
      replyTo: replyingTo
        ? {
            authorName: replyingTo.authorName,
            content: replyingTo.content || (replyingTo.fileType ? '📎 Attachment' : ''),
          }
        : null,
    })
    setNewPost('')
    setReplyingTo(null)
    setPosting(false)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !user) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

      let fileType = 'file'
      let resourceType = 'raw'
      if (file.type.startsWith('image/')) {
        fileType = 'image'
        resourceType = 'image'
      } else if (file.type.startsWith('video/')) {
        fileType = 'video'
        resourceType = 'video'
      }

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
        { method: 'POST', body: formData }
      )
      const data = await res.json()

      await addDoc(collection(db, 'posts'), {
        groupId: GROUP_ID,
        authorId: user.uid,
        authorName: user.displayName || 'Member',
        content: '',
        fileUrl: data.secure_url,
        fileType,
        fileName: file.name,
        createdAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Upload failed:', err)
    }
    setUploading(false)
  }

  const handleDeleteMessage = async (postId) => {
    await deleteDoc(doc(db, 'posts', postId))
    setActiveMenuId(null)
  }

  const startEdit = (post) => {
    setEditingId(post.id)
    setEditText(post.content)
    setActiveMenuId(null)
  }

  const saveEdit = async (postId) => {
    if (!editText.trim()) return
    await updateDoc(doc(db, 'posts', postId), {
      content: editText.trim(),
      edited: true,
    })
    setEditingId(null)
    setEditText('')
  }

  const startReply = (post) => {
    setReplyingTo(post)
    setActiveMenuId(null)
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
    <div className="flex h-screen bg-white dark:bg-[#0a0a14] transition-colors duration-300">
      <Sidebar />

      {/* Chat Column */}
      <div className="flex-1 flex flex-col h-screen pb-16 md:pb-0">
        
        {/* Header */}
        <div
          onClick={() => setShowMembers(true)}
          className="cursor-pointer flex items-center gap-3 px-4 md:px-8 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a14]"
        >
          <div className="w-10 h-10 rounded-full bg-purple-200 dark:bg-purple-900/40 flex items-center justify-center text-xl">
            💻
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{GROUP_NAME}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </p>
          </div>
          {!isMember && (
            <button
              onClick={(e) => { e.stopPropagation(); handleJoinToggle() }}
              className="ml-auto bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              Join
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 flex flex-col gap-3">
          {posts.length === 0 && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              No messages yet. Be the first to share something!
            </p>
          )}
          {posts.map((post) => {
            const isMe = post.authorId === user?.uid
            const isMenuOpen = activeMenuId === post.id
            const isEditing = editingId === post.id

            return (
              <div key={post.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div
                  onClick={() => setActiveMenuId(isMenuOpen ? null : post.id)}
                  className={`max-w-[75%] rounded-2xl overflow-hidden cursor-pointer ${
                    isMe
                      ? 'bg-purple-600 text-white rounded-br-sm'
                      : 'bg-gray-100 dark:bg-[#151225] text-gray-800 dark:text-gray-200 rounded-bl-sm'
                  }`}
                >
                  {!isMe && !post.fileType && (
                    <p
                      onClick={(e) => { e.stopPropagation(); navigate(`/user/${post.authorId}`) }}
                      className="text-xs font-semibold text-purple-600 dark:text-purple-400 px-4 pt-2 cursor-pointer hover:underline"
                    >
                      {post.authorName}
                    </p>
                  )}

                  {post.replyTo && (
                    <div className={`mx-4 mt-2 mb-1 pl-2 border-l-2 text-xs opacity-80 ${isMe ? 'border-white' : 'border-purple-500'}`}>
                      <p className="font-semibold">{post.replyTo.authorName}</p>
                      <p className="truncate">{post.replyTo.content}</p>
                    </div>
                  )}

                  {post.fileType === 'image' && (
                    <img src={post.fileUrl} alt="Shared" className="w-full block" />
                  )}
                  {post.fileType === 'video' && (
                    <video src={post.fileUrl} controls className="w-full block" />
                  )}
                  {post.fileType === 'file' && (
                    <a href={post.fileUrl} target="_blank" rel="noopener noreferrer" className="underline text-sm block px-4 py-2">
                      📎 {post.fileName}
                    </a>
                  )}

                  {isEditing ? (
                    <div className="px-3 py-2 flex flex-col gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded px-2 py-1 text-sm text-gray-900"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); saveEdit(post.id) }}
                          className="text-xs font-semibold underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingId(null) }}
                          className="text-xs underline opacity-80"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    post.content && (
                      <p className="px-4 py-2">
                        {post.content}
                        {post.edited && <span className="text-xs opacity-60 ml-2">(edited)</span>}
                      </p>
                    )
                  )}
                </div>

                {/* Action menu */}
                {isMenuOpen && !isEditing && (
                  <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <button onClick={() => startReply(post)} className="hover:underline">
                      ↩ Reply
                    </button>
                    {isMe && !post.fileType && (
                      <button onClick={() => startEdit(post)} className="hover:underline">
                        ✎ Edit
                      </button>
                    )}
                    {isMe && (
                      <button onClick={() => handleDeleteMessage(post.id)} className="hover:underline text-red-500">
                        🗑 Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Fixed Input Bar */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a14] px-4 md:px-8 py-3">
          {isMember ? (
            <>
              {replyingTo && (
                <div className="flex items-center justify-between bg-gray-100 dark:bg-[#151225] rounded-lg px-3 py-2 mb-2 text-sm">
                  <div>
                    <p className="font-semibold text-purple-600 dark:text-purple-400">
                      Replying to {replyingTo.authorName}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 truncate max-w-xs">
                      {replyingTo.content || '📎 Attachment'}
                    </p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-500 dark:text-gray-400 px-2">
                    ✕
                  </button>
                </div>
              )}
              <form onSubmit={handlePostSubmit} className="flex items-center gap-2">
                <label className="cursor-pointer text-xl px-2">
                  📎
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx"
                  />
                </label>
                <input
                  type="text"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Message..."
                  className="flex-1 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#151225] rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={posting || !newPost.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2 rounded-full transition disabled:opacity-50"
                >
                  Send
                </button>
              </form>
              {uploading && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Uploading...</p>
              )}
            </>
          ) : (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
              Join the group to send messages.
            </p>
          )}
        </div>
      </div>

      {/* Members Panel (slide-over) */}
      {showMembers && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMembers(false)}
          ></div>
          <div className="relative w-full max-w-xs bg-white dark:bg-[#0a0a14] h-full p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                {GROUP_NAME}
              </h2>
              <button
                onClick={() => setShowMembers(false)}
                className="text-gray-500 dark:text-gray-400 text-xl"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{GROUP_DESC}</p>

            {isMember && (
              <button
                onClick={() => { handleJoinToggle(); setShowMembers(false) }}
                className="w-full mb-6 border border-red-400 text-red-500 font-semibold py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              >
                Leave Group
              </button>
            )}

            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase">
              {members.length} {members.length === 1 ? 'Member' : 'Members'}
            </p>
            <div className="flex flex-col gap-3">
              {members.map((m) => (
                <div
                  key={m.userId}
                  onClick={() => navigate(`/user/${m.userId}`)}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-2 -mx-2"
                >
                  <div className="w-9 h-9 rounded-full bg-purple-200 dark:bg-purple-900/40 flex items-center justify-center text-sm font-bold text-purple-700 dark:text-purple-300">
                    {m.userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-gray-800 dark:text-gray-200 text-sm">{m.userName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Community