import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import Sidebar from './Sidebar.jsx'

function Home() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        navigate('/login')
      }
    })
    return () => unsubscribe()
  }, [navigate])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a14] text-gray-900 dark:text-white">
        Loading...
      </div>
    )
  }

  return (
    <div className="dark">
      <div className="flex min-h-screen bg-white dark:bg-[#0a0a14] transition-colors duration-300">
        <Sidebar />
        <div className="flex-1 px-6 md:px-12 py-10 pb-24 md:pb-10 text-gray-900 dark:text-white">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Welcome, {user.displayName || 'friend'}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Great to have you here. Here's your dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Home