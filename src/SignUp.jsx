import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import logo from './assets/logo.png'

function SignUp() {
  const [darkMode, setDarkMode] = useState(true)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await updateProfile(user, { displayName: fullName })

      await setDoc(doc(db, 'users', user.uid), {
        fullName,
        username,
        email,
        points: 0,
        createdAt: new Date().toISOString(),
      })

      navigate('/home')
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
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
          <div className="w-full max-w-4xl bg-purple-50 dark:bg-[#12101f] rounded-2xl shadow-lg overflow-hidden flex flex-col md:flex-row">
            
            {/* Left panel */}
            <div className="bg-purple-100 dark:bg-[#1a1730] p-8 md:w-2/5 flex flex-col justify-center">
              <h2 className="text-2xl font-bold mb-2">Create your account</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Join our community of girls building the future with technology.
              </p>
            </div>

            {/* Right panel - form */}
            <div className="p-8 md:w-3/5">
              <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                {error && (
                  <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {error}
                  </p>
                )}

                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a0a14] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a0a14] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a0a14] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>

                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link to="/login" className="text-purple-500 font-semibold hover:underline">
                    Login
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

export default SignUp