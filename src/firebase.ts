import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDC81DdKQCc7uBwX9hnX1IOjVJzI5Pp-J4",
  authDomain: "cham-cong-c51d3.firebaseapp.com",
  projectId: "cham-cong-c51d3",
  storageBucket: "cham-cong-c51d3.firebasestorage.app",
  messagingSenderId: "849424442352",
  appId: "1:849424442352:web:4fa5b06ab1f1f843eb7335",
  measurementId: "G-8LHNWBJ7WP"
};

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
