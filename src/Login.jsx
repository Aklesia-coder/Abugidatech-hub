import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from './firebase'
import logo from './assets/logo.png'

function Login() {
  const [darkMode, setDarkMode] = useState(true)
  const [identifier, setIdentifier] = useState('') // username or email
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let emailToUse = identifier.trim()

      // If it's not an email format, treat it as a username and look up the real email
      if (!emailToUse.includes('@')) {
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('username', '==', emailToUse))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
          setError('No account found with that username.')
          setLoading(false)
          return
        }

        emailToUse = querySnapshot.docs[0].data().email
      }

      await signInWithEmailAndPassword(auth, emailToUse, password)
      navigate('/home')
    } catch (err) {
      setError('Incorrect username/email or password.')
    }
    setLoading(false)
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-[#0a0a14] transition-colors duration-300 text-gray-900 dark:text-white flex flex-col">
        
        <nav className="flex items-center justify-between px-6 py-4 md:px-12">
          <div className="flex items-center gap-2">
            <img src={logo} alt="AbugidaTech Hub logo" className="w-9 h-9 rounded-full object-cover" />
            <span className="font-bold text-lg">AbugidaTech Hub</span>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </nav>

        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-3xl bg-purple-50 dark:bg-[#12101f] rounded-2xl shadow-lg overflow-hidden flex flex-col md:flex-row">
            
            <div className="bg-purple-100 dark:bg-[#1a1730] p-8 md:w-2/5 flex flex-col justify-center">
              <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Login to continue your journey with AbugidaTech Hub.
              </p>
            </div>

            <div className="p-8 md:w-3/5">
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                {error && (
                  <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {error}
                  </p>
                )}

                <input
                  type="text"
                  placeholder="Username or Email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a0a14] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a0a14] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                <p className="text-right text-sm">
                  <Link to="/forgot-password" className="text-purple-500 hover:underline">
                    Forgot password?
                  </Link>
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>

                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-purple-500 font-semibold hover:underline">
                    Sign up
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login