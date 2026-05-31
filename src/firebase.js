import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCejK9lGAsHuvg-j3uLqStqAR3QBRe2t5k",
  authDomain: "agwida-39e21.firebaseapp.com",
  projectId: "agwida-39e21",
  storageBucket: "agwida-39e21.firebasestorage.app",
  messagingSenderId: "464547131895",
  appId: "1:464547131895:web:56fd49ab2718d908003ef2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
