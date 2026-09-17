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
    `flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs truncate ${
      isActive
        ? 'text-purple-600 dark:text-purple-400 font-semibold'
        : 'text-gray-500 dark:text-gray-400'
    }`

  return (
    <>
      {/* Desktop Sidebar: strictly hidden on mobile with shrink-0 */}
      <aside className="hidden md:flex w-64 shrink-0 h-screen sticky top-0 bg-white dark:bg-[#0a0a14] border-r border-gray-200 dark:border-gray-800 flex-col justify-between py-6 px-4 z-20 select-none">
        <div>
          <div className="flex items-center gap-2 px-4 mb-8">
            <img src={logo} alt="AbugidaTech Hub logo" className="w-9 h-9 rounded-full object-cover shrink-0" />
            <span className="font-bold text-lg text-gray-900 dark:text-white truncate">AbugidaTech Hub</span>
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
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition mb-2 text-sm font-medium"
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition text-sm font-medium"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav: strictly constrained to screen width with w-full and max-w-full */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full max-w-full bg-white dark:bg-[#0a0a14] border-t border-gray-200 dark:border-gray-800 flex items-center justify-around z-40 select-none">
        <NavLink to="/home" className={mobileLinkClass}>🏠 <span className="text-[10px]">Home</span></NavLink>
        <NavLink to="/community" className={mobileLinkClass}>👥 <span className="text-[10px]">Community</span></NavLink>
        <NavLink to="/profile" className={mobileLinkClass}>👤 <span className="text-[10px]">Profile</span></NavLink>
        <NavLink to="/rewards" className={mobileLinkClass}>🏆 <span className="text-[10px]">Rewards</span></NavLink>
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[10px] text-gray-500 dark:text-gray-400"
        >
          <span>{darkMode ? '☀️' : '🌙'}</span>
          <span>Theme</span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[10px] text-gray-500 dark:text-gray-400"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </nav>
    </>
  )
}

export default Sidebar