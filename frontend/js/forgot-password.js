let userEmail = '';

document.getElementById('forgotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const errObj = document.getElementById('errorMsg1');
    const sucObj = document.getElementById('successMsg1');
    const emailInput = document.getElementById('email').value.trim();

    errObj.style.display = 'none';
    sucObj.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gönderiliyor...';

    try {
        const res = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Bir hata oluştu');
        }

        userEmail = emailInput;
        sucObj.textContent = data.message;
        sucObj.style.display = 'block';

        // Proceed to Step 2 after 2 seconds
        setTimeout(() => {
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';
            document.querySelector('.code-inputs input').focus();
        }, 2000);

    } catch (err) {
        errObj.textContent = err.message;
        errObj.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<span>Kodu Gönder</span> <i class="fa-solid fa-paper-plane"></i>';
    }
});

// Auto-advance code inputs
const inputs = document.querySelectorAll('.code-inputs input');
inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && index < inputs.length - 1) {
            inputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && e.target.value.length === 0 && index > 0) {
            inputs[index - 1].focus();
        }
    });
});

document.getElementById('resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('resetBtn');
    const errObj = document.getElementById('errorMsg2');
    
    // Combine the 6 active inputs into one code string
    const code = Array.from(inputs).map(i => i.value).join('');
    const newPassword = document.getElementById('newPassword').value;

    if (code.length !== 6) {
        errObj.textContent = 'Lütfen 6 haneli kodu eksiksiz girin';
        errObj.style.display = 'block';
        return;
    }

    errObj.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Güncelleniyor...';

    try {
        const res = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, code, newPassword })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Sıfırlama başarısız');
        }

        btn.innerHTML = '<span>Başarılı!</span> <i class="fa-solid fa-check"></i>';
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);

    } catch (err) {
        errObj.textContent = err.message;
        errObj.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<span>Şifreyi Güncelle</span> <i class="fa-solid fa-check"></i>';
    }
});
