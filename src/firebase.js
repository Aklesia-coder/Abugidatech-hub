import { initializeApp } from "firebase/app"
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCMFRfxmWf-HzFOyHECE_h6jsJHNYEDf-8",
  authDomain: "abugidatech-hub.firebaseapp.com",
  projectId: "abugidatech-hub",
  storageBucket: "abugidatech-hub.firebasestorage.app",
  messagingSenderId: "1040181538074",
  appId: "1:1040181538074:web:492d7ab3a0dfc9dafb90a3"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
setPersistence(auth, browserLocalPersistence)

export const db = getFirestore(app)