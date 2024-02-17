// INIT
const initFirebase = () => {
	(window as any).dolph = {};
	// FIREBASE
	const fb = document.createElement("script");
	fb.type = "module";
	fb.innerHTML = `
      // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
  import { getDatabase, ref, get, set, onValue, off } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDeTbfb8NVXvzfOG0de4mywNTpoPFNzVrw",
    authDomain: "chess-dolph.firebaseapp.com",
    projectId: "chess-dolph",
    storageBucket: "chess-dolph.appspot.com",
    messagingSenderId: "339694595527",
    appId: "1:339694595527:web:8a6d674b53ef3f0d28fde2",
    databaseURL: "https://chess-dolph-default-rtdb.asia-southeast1.firebasedatabase.app"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const firebase = {
	db,
	ref,
  get,
	set,
	onValue,
	off,
	};
 window.dolph.firebase = firebase;
    `;
	document.body.appendChild(fb);

	// CSS
	var head = document.getElementsByTagName("head")[0];
	var link = document.createElement("link");
	link.rel = "stylesheet";
	link.type = "text/css";
	link.crossOrigin = "anonymous";

	link.href =
		"https://rawcdn.githack.com/thanhdanh27600/chess-server/55a4085ffc1ec44c8dc2e251050ab9679bfc4514/client/evaluation.css";
	head.appendChild(link);
};

console.log("chessdol: firebase run");
initFirebase();
