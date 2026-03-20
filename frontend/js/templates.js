const templatesData = {
    character: {
        text: "A highly detailed, 8k resolution character design of a [Karakter Türü], wearing [Kıyafet/Zırh], holding a [Silah/Obje]. The background is [Arka Plan]. Art style by [Sanatçı/Stil], cinematic lighting, vibrant colors --ar 16:9 --v 6.0",
        inputs: ["Karakter Türü", "Kıyafet/Zırh", "Silah/Obje", "Arka Plan", "Sanatçı/Stil"]
    },
    logo: {
        text: "A minimalist, flat vector logo design for a company named [Marka Adı] in the [Sektör] industry. The logo incorporates a [İkon/Sembol], using a color palette of [Renkler]. Clean background, high quality, professional, highly detailed.",
        inputs: ["Marka Adı", "Sektör", "İkon/Sembol", "Renkler"]
    },
    seo: {
        text: "Lütfen '[Konu Başlığı]' konulu, SEO uyumlu ve [Hedef Kitle] kitlesine hitap eden, yaklaşık [Kelime Sayısı] kelimelik bir blog yazısı hazırla. Yazının dili [Yazım Tonu] olsun ve '[Anahtar Kelimeler]' kelimeleri alt başlıklarla birlikte makale içinde doğal bir şekilde geçirilsin. HTML formatında ver.",
        inputs: ["Konu Başlığı", "Hedef Kitle", "Kelime Sayısı", "Yazım Tonu", "Anahtar Kelimeler"]
    }
};

const select = document.getElementById('templateSelect');
const dynamicInputs = document.getElementById('dynamicInputs');
const resultBox = document.getElementById('resultBox');
const resultText = document.getElementById('resultText');
let currentTemplate = null;

if (select) {
    select.addEventListener('change', (e) => {
        const val = e.target.value;
        dynamicInputs.innerHTML = '';
        
        if (!val) {
            resultBox.style.display = 'none';
            return;
        }
        
        currentTemplate = templatesData[val];
        resultBox.style.display = 'block';
        
        currentTemplate.inputs.forEach(inputName => {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `
                <label>${inputName}</label>
                <input type="text" class="tpl-input" data-placeholder="[${inputName}]" placeholder="Buraya yazın...">
            `;
            dynamicInputs.appendChild(group);
        });

        updatePreview();

        document.querySelectorAll('.tpl-input').forEach(input => {
            input.addEventListener('input', updatePreview);
        });
    });
}

function updatePreview() {
    let finalPrompt = currentTemplate.text;
    document.querySelectorAll('.tpl-input').forEach(input => {
        const placeholder = input.getAttribute('data-placeholder');
        const val = input.value.trim() || placeholder;
        finalPrompt = finalPrompt.split(placeholder).join(val);
    });
    resultText.textContent = finalPrompt;
}

const copyTemplateBtn = document.getElementById('copyTemplateBtn');
if (copyTemplateBtn) {
    copyTemplateBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(resultText.textContent).then(() => {
            copyTemplateBtn.innerHTML = '<i class="fa-solid fa-check"></i> Kopyalandı';
            setTimeout(() => {
                copyTemplateBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Kopyala';
            }, 2000);
        });
    });
}
