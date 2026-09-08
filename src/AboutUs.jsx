import { useState } from 'react'
import logo from './assets/logo.png'

function AboutUs() {
  const [darkMode, setDarkMode] = useState(true)

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-[#0a0a14] transition-colors duration-300 text-gray-900 dark:text-white">
        
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

        <div className="text-center px-6 py-12 max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3">
            Technology for <span className="text-purple-500">her</span> future.
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-1">Learn. Build. Connect. Grow.</p>
          <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
            AbugidaTech Hub is a safe and supportive community where girls can learn technology,
            build projects, connect with other learners, and turn their ideas into reality.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 px-6 md:px-16 py-8 max-w-5xl mx-auto">
          <div className="bg-purple-50 dark:bg-[#12101f] rounded-xl p-6 border border-purple-200 dark:border-purple-900">
            <h2 className="text-xl font-bold mb-3">🌱 Our Mission</h2>
            <p className="text-gray-700 dark:text-gray-300">
              AbugidaTech Hub is a technology and coding community created to empower girls to learn,
              build, connect, and grow through technology. We provide a supportive space where girls
              can develop practical digital skills, work on real projects, share ideas, learn from one
              another, and gain the confidence to become future technology leaders.
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-[#12101f] rounded-xl p-6 border border-purple-200 dark:border-purple-900">
            <h2 className="text-xl font-bold mb-3">💜 Our Vision</h2>
            <p className="text-gray-700 dark:text-gray-300">
              A future where every girl has the opportunity, skills, and confidence to use technology
              to create solutions and shape her future.
            </p>
          </div>
        </div>

        <div className="px-6 md:px-16 py-8 max-w-5xl mx-auto">
          <h2 className="text-xl font-bold mb-5 text-center">💻 What We Focus On</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'Web development',
              'Programming and coding',
              'Python and technology',
              'Building practical projects',
              'Learning resources and opportunities',
              'Community collaboration',
              'Sharing knowledge and ideas',
              'Encouraging girls to pursue technology',
            ].map((item) => (
              <div
                key={item}
                className="bg-white dark:bg-[#151225] border border-purple-200 dark:border-purple-900 rounded-lg p-4 text-sm text-center text-gray-700 dark:text-gray-300 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center px-6 py-14">
          <button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-lg transition">
            ✨ Join the Community
          </button>
        </div>
      </div>
    </div>
  )
}

export default AboutUs