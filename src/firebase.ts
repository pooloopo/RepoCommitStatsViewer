import { initializeApp } from "firebase/app";
import { getAuth, GithubAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBRRsX0DbNH_YMqR1wId0jq8WM6AkOGJDs",
  authDomain: "repocommitstatsviewer.firebaseapp.com",
  projectId: "repocommitstatsviewer",
  storageBucket: "repocommitstatsviewer.firebasestorage.app",
  messagingSenderId: "1074928983417",
  appId: "1:1074928983417:web:315501e3f1aa2ed7dfe3a8",
  measurementId: "G-YKX9W26P6J"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const githubProvider = new GithubAuthProvider();
githubProvider.addScope('repo');
