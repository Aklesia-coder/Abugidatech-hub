import { Routes, Route } from 'react-router-dom'
import Welcome from './Welcome.jsx'
import AboutUs from './AboutUs.jsx'
import SignUp from './SignUp.jsx'
import Login from './Login.jsx'
import Home from './Home.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/home" element={<Home />} />
    </Routes>
  )
}

export default App