const loginBtn = document.getElementById('login-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const signupLink = document.getElementById('signup-link');

loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    errorMessage.textContent = ''; // Clear previous errors

    const result = await window.api.login({ email, password });

    if (result.success) {
        console.log('Login successful!', result.user);
        window.api.navigate('dashboard.html');
    } else {
        // Firebase provides user-friendly error messages, so we can display them directly.
        errorMessage.textContent = result.error;
    }
});

signupLink.addEventListener('click', () => {
    window.api.navigate('signup.html');
});
