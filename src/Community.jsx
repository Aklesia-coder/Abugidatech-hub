import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore'
import { auth, db } from './firebase'
import Sidebar from './Sidebar.jsx'
import { uploadToCloudinary } from './utils/media.js'

const GROUP_ID = 'web-design'
const GROUP_NAME = 'Web Development'
const GROUP_DESC = 'Learn and build websites together. Share your questions, tips, and achievements!'
const FOUNDER_EMAIL = 'elohe996@gmail.com'

function Community() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [isMember, setIsMember] = useState(false)
  const [isFounder, setIsFounder] = useState(false)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [removingMemberId, setRemovingMemberId] = useState(null)
  const [errorBanner, setErrorBanner] = useState('')

  const [pendingFile, setPendingFile] = useState(null)
  const [pendingPreview, setPendingPreview] = useState(null)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const checkMembership = async (uid) => {
    try {
      const memberDoc = await getDoc(
        doc(db, 'groupMembers', `${GROUP_ID}_${uid}`)
      )
      setIsMember(memberDoc.exists())
    } catch (err) {
      console.warn('Error checking membership:', err)
    }
  }

  const loadMembers = async () => {
    try {
      const q = query(
        collection(db, 'groupMembers'),
        where('groupId', '==', GROUP_ID)
      )
      const membersSnapshot = await getDocs(q)
      const list = membersSnapshot.docs.map((d) => d.data())
      setMembers(list)
    } catch (err) {
      console.warn('Error loading members:', err)
    }
  }

  const handleSelectChatFile = (file) => {
    if (!file) {
      if (pendingPreview?.url) URL.revokeObjectURL(pendingPreview.url)
      setPendingFile(null)
      setPendingPreview(null)
      return
    }
    if (pendingPreview?.url) URL.revokeObjectURL(pendingPreview.url)
    setPendingFile(file)
    const url = URL.createObjectURL(file)
    setPendingPreview({
      url,
      type: file.type.startsWith('video/') ? 'video' : 'image',
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(1),
    })
  }

  const handleClearChatFile = () => {
    if (pendingPreview?.url) URL.revokeObjectURL(pendingPreview.url)
    setPendingFile(null)
    setPendingPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        setIsFounder(
          currentUser.email?.toLowerCase() === FOUNDER_EMAIL.toLowerCase()
        )
        try {
          await checkMembership(currentUser.uid)
        } catch (err) {
          console.warn('Membership check warning:', err)
        }
        try {
          await loadMembers()
        } catch (err) {
          console.warn('Load members warning:', err)
        }
      } else {
        setIsFounder(false)
        setIsMember(false)
        setMembers([])
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      where('groupId', '==', GROUP_ID)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const postsList = snapshot.docs
          .map((postDoc) => ({
            id: postDoc.id,
            ...postDoc.data()
          }))
          .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))

        setPosts(postsList)
      },
      (error) => {
        console.error('Posts snapshot listener error:', error)
      }
    )

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [posts.length])

  const handleJoinToggle = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    const memberRef = doc(
      db,
      'groupMembers',
      `${GROUP_ID}_${user.uid}`
    )

    try {
      if (isMember) {
        await deleteDoc(memberRef)
        setIsMember(false)
      } else {
        await setDoc(memberRef, {
          groupId: GROUP_ID,
          userId: user.uid,
          userName: user.displayName || 'Member',
          joinedAt: new Date().toISOString()
        })
        setIsMember(true)
      }
      await loadMembers()
    } catch (err) {
      console.error('Error toggling membership:', err)
    }
  }

  const handleRemoveMember = async (member) => {
    if (!user || user.email?.toLowerCase() !== FOUNDER_EMAIL.toLowerCase()) {
      return
    }

    if (member.userId === user.uid) {
      alert('You cannot remove yourself as founder.')
      return
    }

    const confirmed = window.confirm(
      `Remove ${member.userName || 'this member'} from ${GROUP_NAME}?`
    )
    if (!confirmed) return

    setRemovingMemberId(member.userId)
    try {
      await deleteDoc(
        doc(db, 'groupMembers', `${GROUP_ID}_${member.userId}`)
      )
      await loadMembers()
    } catch (error) {
      console.error('Failed to remove member:', error)
      alert('Could not remove this member. Please try again.')
    } finally {
      setRemovingMemberId(null)
    }
  }

  const handlePostSubmit = async (e) => {
    e.preventDefault()
    if ((!newPost.trim() && !pendingFile) || !user || !isMember) return

    setPosting(true)
    setErrorBanner('')

    try {
      let fileUrl = ''
      let fileType = ''
      let fileName = ''

      if (pendingFile) {
        setUploadStatus('Uploading attachment...')
        const uploadResult = await uploadToCloudinary(pendingFile, (status) => setUploadStatus(status))
        fileUrl = uploadResult.url || ''
        fileType = uploadResult.fileType || ''
        fileName = uploadResult.fileName || pendingFile.name
      }

      await addDoc(collection(db, 'posts'), {
        groupId: GROUP_ID,
        authorId: user.uid,
        authorName: user.displayName || 'Member',
        content: newPost.trim(),
        fileUrl: fileUrl || '',
        fileType: fileType || '',
        fileName: fileName || '',
        createdAt: new Date().toISOString(),
        replyTo: replyingTo
          ? {
              authorName: replyingTo.authorName,
              content:
                replyingTo.content ||
                (replyingTo.fileType ? '📎 Attachment' : '')
            }
          : null
      })

      setNewPost('')
      handleClearChatFile()
      setReplyingTo(null)
      setUploadStatus('')
    } catch (error) {
      console.error('Post failed:', error)
      setErrorBanner(error.message || 'Failed to send message. Please try again.')
    } finally {
      setPosting(false)
      setUploadStatus('')
    }
  }

  const handleDeleteMessage = async (postId) => {
    try {
      await deleteDoc(doc(db, 'posts', postId))
      setActiveMenuId(null)
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  const startEdit = (post) => {
    setEditingId(post.id)
    setEditText(post.content)
    setActiveMenuId(null)
  }

  const saveEdit = async (postId) => {
    if (!editText.trim()) return

    try {
      await updateDoc(doc(db, 'posts', postId), {
        content: editText.trim(),
        edited: true
      })
      setEditingId(null)
      setEditText('')
    } catch (error) {
      console.error('Edit failed:', error)
    }
  }

  const startReply = (post) => {
    setReplyingTo(post)
    setActiveMenuId(null)
  }

  if (loading) {
    return (
      <div className="flex h-screen h-[100dvh] w-full max-w-full bg-white dark:bg-[#0a0a14] text-gray-900 dark:text-white overflow-hidden">
        <Sidebar />
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading Community...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen h-[100dvh] w-full max-w-full overflow-hidden bg-white dark:bg-[#0a0a14] text-gray-900 dark:text-white transition-colors duration-300 relative">
      <Sidebar />

      {/* Main Chat Column */}
      <div className="flex-1 min-w-0 w-full max-w-full flex flex-col h-full overflow-hidden pb-14 md:pb-0 relative bg-white dark:bg-[#0a0a14]">
        
        {/* Chat Header */}
        <header
          onClick={() => setShowMembers(true)}
          className="cursor-pointer flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-[#0a0a14]/95 backdrop-blur-sm z-10 shrink-0 select-none shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-xl shrink-0">
              💻
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate">
                  {GROUP_NAME}
                </h1>
                <span className="text-[10px] bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 font-semibold px-2 py-0.5 rounded-full shrink-0">
                  Online
                </span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 truncate">
                {members.length} {members.length === 1 ? 'member' : 'members'} • Tap for group info
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isMember ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleJoinToggle()
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-lg transition shadow-xs"
              >
                Join Group
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMembers(true)
                }}
                className="text-xs border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/80 text-gray-700 dark:text-gray-300 font-medium px-3 py-1.5 rounded-lg transition"
              >
                👥 Members
              </button>
            )}
          </div>
        </header>

        {/* Error Banner if any */}
        {errorBanner && (
          <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/50 px-4 py-2 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
            <span>⚠️ {errorBanner}</span>
            <button
              onClick={() => setErrorBanner('')}
              className="font-bold hover:text-red-900 dark:hover:text-white px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Messages Feed Container */}
        <div className="flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-4 flex flex-col gap-3.5">
          {posts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-3xl mb-3">
                💬
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Welcome to {GROUP_NAME}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                No messages yet. Be the first to start the conversation!
              </p>
            </div>
          ) : (
            posts.map((post) => {
              const isMe = post.authorId === user?.uid
              const isMenuOpen = activeMenuId === post.id
              const isEditing = editingId === post.id

              return (
                <div
                  key={post.id}
                  className={`flex flex-col w-full max-w-full ${
                    isMe ? 'items-end' : 'items-start'
                  }`}
                >
                  {!isMe && (
                    <span
                      onClick={() => navigate(`/user/${post.authorId}`)}
                      className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mb-1 px-1 cursor-pointer hover:underline"
                    >
                      {post.authorName}
                    </span>
                  )}

                  <div
                    onClick={() => setActiveMenuId(isMenuOpen ? null : post.id)}
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl overflow-hidden cursor-pointer shadow-xs transition-shadow ${
                      isMe
                        ? 'bg-purple-600 text-white rounded-br-xs'
                        : 'bg-gray-100 dark:bg-[#151225] text-gray-800 dark:text-gray-200 rounded-bl-xs border border-gray-200/60 dark:border-gray-800/80'
                    }`}
                  >
                    {post.replyTo && (
                      <div
                        className={`mx-3 mt-2 mb-1 p-2 rounded-lg text-xs ${
                          isMe
                            ? 'bg-purple-700/60 text-purple-100 border-l-2 border-white'
                            : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-l-2 border-purple-500'
                        }`}
                      >
                        <p className="font-semibold text-[11px] truncate">
                          {post.replyTo.authorName}
                        </p>
                        <p className="truncate opacity-90 text-[11px]">
                          {post.replyTo.content}
                        </p>
                      </div>
                    )}

                    {post.fileType === 'image' && post.fileUrl && (
                      <div className="overflow-hidden bg-black/10 dark:bg-black/30 flex items-center justify-center max-w-full">
                        <img
                          src={post.fileUrl}
                          alt="Shared attachment"
                          className="max-h-72 sm:max-h-96 w-auto max-w-full object-contain block mx-auto"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {post.fileType === 'video' && post.fileUrl && (
                      <div className="overflow-hidden bg-black flex items-center justify-center max-w-full">
                        <video
                          src={post.fileUrl}
                          controls
                          className="max-h-72 sm:max-h-96 w-full object-contain block"
                        />
                      </div>
                    )}

                    {post.fileType === 'raw' && post.fileUrl && (
                      <a
                        href={post.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-xs sm:text-sm block px-3.5 py-2 hover:opacity-80 break-all"
                      >
                        📎 {post.fileName || 'Download File'}
                      </a>
                    )}

                    {isEditing ? (
                      <div className="p-3 flex flex-col gap-2 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => saveEdit(post.id)}
                            className="text-xs font-semibold px-2.5 py-1 bg-purple-700 text-white rounded-md hover:bg-purple-800"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="text-xs px-2 py-1 opacity-80 hover:opacity-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      post.content && (
                        <p className="px-3.5 py-2 text-sm whitespace-pre-wrap break-words">
                          {post.content}
                          {post.edited && (
                            <span className="text-[10px] opacity-65 ml-1.5 italic">
                              (edited)
                            </span>
                          )}
                        </p>
                      )
                    )}
                  </div>

                  {isMenuOpen && !isEditing && (
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 dark:text-gray-400 px-1 select-none">
                      <button
                        type="button"
                        onClick={() => startReply(post)}
                        className="hover:text-purple-600 dark:hover:text-purple-400 font-medium"
                      >
                        ↩ Reply
                      </button>

                      {isMe && !post.fileUrl && (
                        <button
                          type="button"
                          onClick={() => startEdit(post)}
                          className="hover:text-purple-600 dark:hover:text-purple-400 font-medium"
                        >
                          ✎ Edit
                        </button>
                      )}

                      {(isMe || isFounder) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(post.id)}
                          className="hover:text-red-500 font-medium text-red-400"
                        >
                          🗑 Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input & Action Bar */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a14] px-3 sm:px-6 py-2.5 shrink-0 z-10">
          {isMember ? (
            <div className="flex flex-col gap-2 max-w-4xl mx-auto">
              {replyingTo && (
                <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 rounded-xl px-3 py-1.5 text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      Replying to {replyingTo.authorName}:{' '}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300 truncate inline-block max-w-[240px] align-bottom">
                      {replyingTo.content || 'Attachment'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {pendingPreview && (
                <div className="flex items-center justify-between bg-gray-50 dark:bg-[#151225] border border-gray-200 dark:border-gray-800 rounded-xl p-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {pendingPreview.type === 'image' ? (
                      <img
                        src={pendingPreview.url}
                        alt="Preview"
                        className="w-10 h-10 rounded-lg object-cover border border-purple-300 dark:border-purple-800 shrink-0"
                      />
                    ) : (
                      <span className="text-xl px-2">🎬</span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate text-gray-800 dark:text-gray-200">{pendingPreview.name}</p>
                      <p className="text-[10px] text-gray-500">{pendingPreview.size} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearChatFile}
                    className="text-red-500 hover:text-red-700 font-semibold px-2 py-1 text-xs"
                  >
                    Remove
                  </button>
                </div>
              )}

              <form onSubmit={handlePostSubmit} className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => handleSelectChatFile(e.target.files?.[0])}
                  className="hidden"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach image, video or document"
                  className="p-2 text-xl text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition shrink-0"
                >
                  📎
                </button>

                <input
                  type="text"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Type a message..."
                  disabled={posting}
                  className="flex-1 min-w-0 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#151225] rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                />

                <button
                  type="submit"
                  disabled={posting || (!newPost.trim() && !pendingFile)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 rounded-full transition disabled:opacity-50 shrink-0 shadow-xs flex items-center gap-1.5"
                >
                  {posting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="hidden sm:inline">{uploadStatus || 'Sending...'}</span>
                    </>
                  ) : (
                    'Send'
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="py-2 text-center">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
                Join {GROUP_NAME} to chat, ask questions, and share projects!
              </p>
              <button
                type="button"
                onClick={handleJoinToggle}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-5 py-2 rounded-full transition shadow-xs"
              >
                Join Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Members Drawer Panel */}
      {showMembers && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setShowMembers(false)}
          />
          <div className="relative w-full max-w-xs bg-white dark:bg-[#0a0a14] h-full p-6 overflow-y-auto border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-800 pb-3">
                <div>
                  <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                    {GROUP_NAME}
                  </h2>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Community Channel
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMembers(false)}
                  className="text-gray-500 hover:text-gray-800 dark:hover:text-white text-xl p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
                {GROUP_DESC}
              </p>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Members ({members.length})
                </span>
                {isFounder && (
                  <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-semibold px-2 py-0.5 rounded-md">
                    Founder View
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
                {members.map((m) => {
                  const isCurrentUser = m.userId === user?.uid
                  const isBeingRemoved = removingMemberId === m.userId

                  return (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                    >
                      <div
                        onClick={() => {
                          setShowMembers(false)
                          navigate(`/user/${m.userId}`)
                        }}
                        className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-200 dark:bg-purple-900/50 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300 shrink-0">
                          {(m.userName || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                            {m.userName || 'Member'}
                          </p>
                          {isCurrentUser && (
                            <span className="text-[10px] text-purple-500 font-semibold">You</span>
                          )}
                        </div>
                      </div>

                      {isFounder && !isCurrentUser && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m)}
                          disabled={isBeingRemoved}
                          className="text-[11px] text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-50"
                        >
                          {isBeingRemoved ? '...' : 'Remove'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {isMember && (
              <button
                type="button"
                onClick={() => {
                  handleJoinToggle()
                  setShowMembers(false)
                }}
                className="w-full mt-6 border border-red-300 dark:border-red-900/60 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold py-2 rounded-xl text-xs transition"
              >
                Leave Group
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Community