import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import Sidebar from './Sidebar.jsx'
import { useNavigate } from 'react-router-dom'

const medals = ['🥇', '🥈', '🥉']

function Rewards() {
  const [topUsers, setTopUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(3))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      setTopUsers(list)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0a0a14] transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 px-6 md:px-12 py-10 pb-24 md:pb-10 text-gray-900 dark:text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">🏆 Rewards</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Top contributors ranked by points earned from community activity.
        </p>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        ) : topUsers.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No members yet.</p>
        ) : (
          <div className="max-w-md flex flex-col gap-4">
            {topUsers.map((u, index) => (
              <div
                key={u.id}
                onClick={() => navigate(`/user/${u.id}`)}
                className="cursor-pointer flex items-center gap-4 bg-purple-50 dark:bg-[#12101f] border border-purple-200 dark:border-purple-900 rounded-xl p-5 hover:shadow-md transition"
              >
                <span className="text-3xl">{medals[index]}</span>
                {u.photoUrl ? (
                  <img src={u.photoUrl} alt={u.fullName} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-purple-200 dark:bg-purple-900/40 flex items-center justify-center font-bold text-purple-700 dark:text-purple-300">
                    {(u.fullName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-bold">{u.fullName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">@{u.username}</p>
                </div>
                <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">
                  {u.points ?? 0} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Rewards