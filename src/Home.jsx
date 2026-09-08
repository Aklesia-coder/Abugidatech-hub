import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import logo from './assets/logo.png'

function Home() {
  const [darkMode, setDarkMode] = useState(true)
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

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a14] text-gray-900 dark:text-white">
        Loading...
      </div>
    )
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-[#0a0a14] transition-colors duration-300 text-gray-900 dark:text-white">
        
        <nav className="flex items-center justify-between px-6 py-4 md:px-12">
          <div className="flex items-center gap-2">
            <img src={logo} alt="AbugidaTech Hub logo" className="w-9 h-9 rounded-full object-cover" />
            <span className="font-bold text-lg">AbugidaTech Hub</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Logout
            </button>
          </div>
        </nav>

        <div className="px-6 md:px-16 py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Welcome, {user.displayName || 'friend'}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Great to have you here. Your dashboard is coming together — Community, Profile, and Rewards sections are next.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Home