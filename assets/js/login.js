import { auth } from './firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    let isSignUpMode = false;
    
    const toggleLink = document.getElementById('toggle-auth-link');
    const subtitle = document.getElementById('auth-subtitle');
    const toggleText = document.getElementById('toggle-auth-text');
    const submitText = document.getElementById('submit-text');
    const errorBox = document.getElementById('auth-error');
    const errorText = document.getElementById('auth-error-text');

    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUpMode = !isSignUpMode;
        
        if (isSignUpMode) {
            subtitle.textContent = "Create a new account to get started.";
            submitText.textContent = "Create account";
            toggleText.innerHTML = `Already have an account? <a href="#" id="toggle-auth-link" class="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">Sign in here</a>`;
        } else {
            subtitle.textContent = "Welcome back! Please enter your details.";
            submitText.textContent = "Sign in to account";
            toggleText.innerHTML = `Don't have an account? <a href="#" id="toggle-auth-link" class="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">Sign up for free</a>`;
        }
        
        // Reattach listener to new innerHTML link
        document.getElementById('toggle-auth-link').addEventListener('click', arguments.callee);
        errorBox.classList.add('hidden');
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = form.querySelector('button[type="submit"]');
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const originalHtml = btn.innerHTML;
        
        btn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            ${isSignUpMode ? 'Creating account...' : 'Signing in...'}
        `;
        btn.classList.add('opacity-90', 'cursor-not-allowed');
        btn.disabled = true;
        errorBox.classList.add('hidden');

        try {
            if (isSignUpMode) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            window.location.href = '../index.html';
        } catch (error) {
            console.error("Auth error", error);
            errorText.textContent = error.message.replace('Firebase:', '').trim();
            errorBox.classList.remove('hidden');
            
            btn.innerHTML = originalHtml;
            btn.classList.remove('opacity-90', 'cursor-not-allowed');
            btn.disabled = false;
        }
    });
});
