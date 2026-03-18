// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GithubAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBRRsX0DbNH_YMqR1wId0jq8WM6AkOGJDs",
  authDomain: "repocommitstatsviewer.firebaseapp.com",
  projectId: "repocommitstatsviewer",
  storageBucket: "repocommitstatsviewer.firebasestorage.app",
  messagingSenderId: "1074928983417",
  appId: "1:1074928983417:web:315501e3f1aa2ed7dfe3a8",
  measurementId: "G-YKX9W26P6J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize GitHub Provider
export const githubProvider = new GithubAuthProvider();
// Request the 'repo' scope so you have permission to read commit data
githubProvider.addScope('repo'); 
