const signupBtn = document.getElementById('signup-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const loginLink = document.getElementById('login-link');

signupBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    errorMessage.textContent = ''; // Clear previous errors

    if (password.length < 6) {
        errorMessage.textContent = 'Password should be at least 6 characters.';
        return;
    }

    const result = await window.api.signup({ email, password });

    if (result.success) {
        console.log('Signup successful!', result.user);
        window.api.navigate('dashboard.html'); // Navigate to dashboard after successful signup
    } else {
        errorMessage.textContent = result.error;
    }
});

loginLink.addEventListener('click', () => {
    window.api.navigate('index.html');
});