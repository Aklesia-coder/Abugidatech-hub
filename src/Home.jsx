import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection, addDoc, query, orderBy, onSnapshot,
  doc, getDoc, setDoc, updateDoc, increment, where
} from 'firebase/firestore'
import { auth, db } from './firebase'
import Sidebar from './Sidebar.jsx'

const FOUNDER_EMAIL = 'elohe996@gmail.com'

function Home() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  const [isFounder, setIsFounder] = useState(false)

  const [tasks, setTasks] = useState([])
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [postingTask, setPostingTask] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        setIsFounder(currentUser.email === FOUNDER_EMAIL)
      } else {
        navigate('/login')
      }
    })
    return () => unsubscribe()
  }, [navigate])

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      setTasks(list)
    })
    return () => unsubscribe()
  }, [])

  const handlePostTask = async (e) => {
    e.preventDefault()
    if (!taskTitle.trim()) return
    setPostingTask(true)
    await addDoc(collection(db, 'tasks'), {
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      createdAt: new Date().toISOString(),
    })
    setTaskTitle('')
    setTaskDesc('')
    setPostingTask(false)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a14] text-gray-900 dark:text-white">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0a0a14] transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 px-6 md:px-12 py-10 pb-24 md:pb-10 text-gray-900 dark:text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Welcome, {user.displayName || 'friend'}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Great to have you here. Here's your dashboard.
        </p>

        {isFounder && (
          <form
            onSubmit={handlePostTask}
            className="max-w-xl bg-purple-50 dark:bg-[#12101f] border border-purple-200 dark:border-purple-900 rounded-xl p-5 mb-8 flex flex-col gap-3"
          >
            <p className="font-bold text-lg">📌 Post a New Task</p>
            <input
              type="text"
              placeholder="Task title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              required
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a0a14] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <textarea
              placeholder="Describe the task or question..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              rows={3}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a0a14] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
            <button
              type="submit"
              disabled={postingTask}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {postingTask ? 'Posting...' : 'Post Task'}
            </button>
          </form>
        )}

        <div className="max-w-xl flex flex-col gap-4">
          <h2 className="text-xl font-bold">📋 Tasks</h2>
          {tasks.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No tasks posted yet.</p>
          )}
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} user={user} isFounder={isFounder} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, user, isFounder }) {
  const [myAnswer, setMyAnswer] = useState(null)
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [allAnswers, setAllAnswers] = useState([])
  const [pointsInputs, setPointsInputs] = useState({})

  useEffect(() => {
    if (isFounder) {
      const q = query(collection(db, 'taskAnswers'), where('taskId', '==', task.id))
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        setAllAnswers(list)
      })
      return () => unsubscribe()
    } else {
      const loadMine = async () => {
        const answerDoc = await getDoc(doc(db, 'taskAnswers', `${task.id}_${user.uid}`))
        if (answerDoc.exists()) {
          setMyAnswer(answerDoc.data())
        }
      }
      loadMine()
    }
  }, [task.id, isFounder, user.uid])

  const handleSubmitAnswer = async (e) => {
    e.preventDefault()
    if (!answerText.trim()) return
    setSubmitting(true)
    const answerData = {
      taskId: task.id,
      userId: user.uid,
      userName: user.displayName || 'Member',
      answer: answerText.trim(),
      points: 0,
      reviewed: false,
      createdAt: new Date().toISOString(),
    }
    await setDoc(doc(db, 'taskAnswers', `${task.id}_${user.uid}`), answerData)
    setMyAnswer(answerData)
    setAnswerText('')
    setSubmitting(false)
  }

  const handleAwardPoints = async (answer) => {
    const pts = parseInt(pointsInputs[answer.id] || 0, 10)
    if (!pts || pts <= 0) return

    await updateDoc(doc(db, 'taskAnswers', answer.id), {
      points: pts,
      reviewed: true,
    })
    await updateDoc(doc(db, 'users', answer.userId), {
      points: increment(pts),
    })
    setPointsInputs((prev) => ({ ...prev, [answer.id]: '' }))
  }

  return (
    <div className="bg-white dark:bg-[#151225] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <p className="font-bold mb-1">{task.title}</p>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{task.description}</p>

      {isFounder ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Answers ({allAnswers.length})
          </p>
          {allAnswers.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No answers yet.</p>
          )}
          {allAnswers.map((answer) => (
            <div key={answer.id} className="bg-purple-50 dark:bg-[#12101f] rounded-lg p-3">
              <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                {answer.userName}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{answer.answer}</p>
              {answer.reviewed ? (
                <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                  ✓ Awarded {answer.points} points
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Points"
                    value={pointsInputs[answer.id] || ''}
                    onChange={(e) =>
                      setPointsInputs((prev) => ({ ...prev, [answer.id]: e.target.value }))
                    }
                    className="w-20 border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a0a14] rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => handleAwardPoints(answer)}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-1.5 rounded transition"
                  >
                    Award
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : myAnswer ? (
        <div className="bg-purple-50 dark:bg-[#12101f] rounded-lg p-3 text-sm">
          <p className="text-gray-700 dark:text-gray-300 mb-1">Your answer: {myAnswer.answer}</p>
          {myAnswer.reviewed ? (
            <p className="text-green-600 dark:text-green-400 font-semibold text-xs">
              ✓ Reviewed — {myAnswer.points} points awarded
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">Waiting for review...</p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmitAnswer} className="flex flex-col gap-2">
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Type your answer..."
            rows={2}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a0a14] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="self-start bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </form>
      )}
    </div>
  )
}

export default Home