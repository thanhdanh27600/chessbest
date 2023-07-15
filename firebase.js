import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import {
    getDatabase,
    off,
    onValue,
    ref,
    set,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyDeTbfb8NVXvzfOG0de4mywNTpoPFNzVrw",
	authDomain: "chess-dolph.firebaseapp.com",
	projectId: "chess-dolph",
	storageBucket: "chess-dolph.appspot.com",
	messagingSenderId: "339694595527",
	appId: "1:339694595527:web:8a6d674b53ef3f0d28fde2",
	databaseURL:
		"https://chess-dolph-default-rtdb.asia-southeast1.firebasedatabase.app",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export const firebase = {
	db,
	ref,
	set,
	onValue,
	off,
};
