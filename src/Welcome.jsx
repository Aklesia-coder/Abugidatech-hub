import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from './assets/logo.png'

function Welcome() {
  const [darkMode, setDarkMode] = useState(true)
  const navigate = useNavigate()

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-[#0a0a14] transition-colors duration-300">
        
        <nav className="flex items-center justify-between px-6 py-4 md:px-12">
          <div className="flex items-center gap-2">
            <img src={logo} alt="AbugidaTech Hub logo" className="w-9 h-9 rounded-full object-cover" />
            <span className="font-bold text-lg text-gray-900 dark:text-white">
              AbugidaTech Hub
            </span>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </nav>

        <div className="flex flex-col md:flex-row items-center justify-between px-6 md:px-16 py-10 md:py-20 gap-10">
          
          <div className="flex-1 flex justify-center">
            <div className="relative w-64 h-64 md:w-96 md:h-96 rounded-full border-4 border-purple-500 shadow-[0_0_60px_rgba(168,85,247,0.5)] overflow-hidden flex items-center justify-center bg-purple-50 dark:bg-[#12101f]">
              <img src={logo} alt="AbugidaTech Hub" className="w-full h-full object-cover rounded-full" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-extrabold mb-2">
              <span className="text-gray-900 dark:text-white">Abugida</span>
              <span className="text-purple-500">Tech Hub</span>
            </h1>

            <p className="text-purple-500 font-semibold text-sm tracking-wide mb-2">
              A TECHNOLOGY COMMUNITY FOR GIRLS
            </p>
            <div className="w-16 h-1 bg-purple-500 mx-auto md:mx-0 mb-6 rounded"></div>

            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Technology for <span className="text-purple-500">her</span> future.
            </h2>

            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto md:mx-0">
              Learn web development, build real projects, and connect with other girls. 💜
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button
                onClick={() => navigate('/signup')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition"
              >
                ✨ Join the Community
              </button>
              <button
                onClick={() => navigate('/about')}
                className="border border-gray-400 dark:border-gray-500 text-gray-900 dark:text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                ⓘ About Us
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Welcome