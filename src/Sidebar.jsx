import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import { useTheme } from './ThemeContext.jsx'
import logo from './assets/logo.png'

function Sidebar() {
  const navigate = useNavigate()
  const { darkMode, setDarkMode } = useTheme()

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const desktopLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
      isActive
        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-semibold'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`

  const mobileLinkClass = ({ isActive }) =>
    `flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs ${
      isActive
        ? 'text-purple-600 dark:text-purple-400 font-semibold'
        : 'text-gray-500 dark:text-gray-400'
    }`

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 min-h-screen bg-white dark:bg-[#0a0a14] border-r border-gray-200 dark:border-gray-800 flex-col justify-between py-6 px-4">
        <div>
          <div className="flex items-center gap-2 px-4 mb-8">
            <img src={logo} alt="AbugidaTech Hub logo" className="w-9 h-9 rounded-full object-cover" />
            <span className="font-bold text-lg text-gray-900 dark:text-white">AbugidaTech Hub</span>
          </div>

          <nav className="flex flex-col gap-2">
            <NavLink to="/home" className={desktopLinkClass}>🏠 Home</NavLink>
            <NavLink to="/community" className={desktopLinkClass}>👥 Community</NavLink>
            <NavLink to="/profile" className={desktopLinkClass}>👤 My Profile</NavLink>
            <NavLink to="/rewards" className={desktopLinkClass}>🏆 Rewards</NavLink>
          </nav>
        </div>

        <div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition mb-2"
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0a0a14] border-t border-gray-200 dark:border-gray-800 flex items-center justify-around z-50">
        <NavLink to="/home" className={mobileLinkClass}>🏠 <span>Home</span></NavLink>
        <NavLink to="/community" className={mobileLinkClass}>👥 <span>Community</span></NavLink>
        <NavLink to="/profile" className={mobileLinkClass}>👤 <span>Profile</span></NavLink>
        <NavLink to="/rewards" className={mobileLinkClass}>🏆 <span>Rewards</span></NavLink>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs text-gray-500 dark:text-gray-400"
        >
          {darkMode ? '☀️' : '🌙'} <span>Theme</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs text-gray-500 dark:text-gray-400"
        >
          🚪 <span>Logout</span>
        </button>
      </div>
    </>
  )
}

export default Sidebar