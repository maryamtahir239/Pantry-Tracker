// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Required for side-effects

import { getFirestore } from "firebase/firestore";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2ME7PDqe8WqW9RcYV1flUaMblcEJwiHo",
  authDomain: "pantry-tracker-1e233.firebaseapp.com",
  projectId: "pantry-tracker-1e233",
  storageBucket: "pantry-tracker-1e233.appspot.com",
  messagingSenderId: "263599751308",
  appId: "1:263599751308:web:7bd0b47caa14c5e095bba9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);