import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// Check if user is authenticated
export function requireAuth(redirectUrl = '../auth/login.html') {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Clean up listener once we get the initial state
            if (user) {
                // User is signed in
                updateProfileUI(user);
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

// Update the sidebar profile UI automatically
function updateProfileUI(user) {
    if(!user || !user.email) return;
    
    // We expect the email to be something like admin@tracker.pro
    const emailStr = user.email;
    // Extract first part of email for display name fallback (e.g. "admin" from "admin@tracker.pro")
    let displayName = user.displayName || emailStr.split('@')[0];
    // Capitalize first letter
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    
    // Create initial (e.g. "A" for Admin)
    const initial = displayName.charAt(0).toUpperCase();

    // DOM Elements (We query all in case there are multiple or mobile views)
    const emailEls = document.querySelectorAll('.profile-email');
    const nameEls = document.querySelectorAll('.profile-name');
    const initialEls = document.querySelectorAll('.profile-initial');

    emailEls.forEach(el => el.textContent = emailStr);
    nameEls.forEach(el => el.textContent = displayName);
    initialEls.forEach(el => el.textContent = initial);
}
