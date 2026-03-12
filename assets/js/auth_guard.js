import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// Check if user is authenticated
export function requireAuth(redirectUrl = '../auth/login.html') {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Clean up listener once we get the initial state
            if (user) {
                // User is signed in
                resolve(user);
            } else {
                // User is signed out
                window.location.href = redirectUrl;
                reject(new Error("Unauthorized"));
            }
        });
    });
}

// Attach logout handler to all buttons with data-logout attribute
export function setupLogout(redirectUrl = '../auth/login.html') {
    const logoutBtns = document.querySelectorAll('[data-logout]');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                window.location.href = redirectUrl;
            } catch (error) {
                console.error("Logout error", error);
            }
        });
    });
}
