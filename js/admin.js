// Admin functionality

// Store accumulated images with titles
let uploadedImages = []; // Array of { file, title }
let adminInitialized = false;
let currentAuthMode = 'login';

function setAuthMode(mode) {
    currentAuthMode = mode;
    document.getElementById('signup-success').style.display = 'none';
    document.getElementById('password-error').style.display = 'none';
    const loginBtn = document.getElementById('login-btn');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    if (mode === 'login') {
        loginBtn.textContent = 'Log In';
        tabLogin.classList.add('bg-white', 'shadow', 'text-gray-800');
        tabLogin.classList.remove('text-gray-500');
        tabSignup.classList.remove('bg-white', 'shadow', 'text-gray-800');
        tabSignup.classList.add('text-gray-500');
    } else {
        loginBtn.textContent = 'Sign Up';
        tabSignup.classList.add('bg-white', 'shadow', 'text-gray-800');
        tabSignup.classList.remove('text-gray-500');
        tabLogin.classList.remove('bg-white', 'shadow', 'text-gray-800');
        tabLogin.classList.add('text-gray-500');
    }
}

async function handleGoogleSignIn() {
    try { await signInWithGoogle(); }
    catch (err) {
        const el = document.getElementById('password-error');
        el.textContent = err.message;
        el.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const passwordModal = document.getElementById('password-modal');
    const passwordForm  = document.getElementById('password-form');
    const emailInput    = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordError = document.getElementById('password-error');
    const loginBtn      = document.getElementById('login-btn');
    const adminContent  = document.getElementById('admin-content');
    const logoutBtn     = document.getElementById('logout-btn');

    // Pre-hide modal immediately if session exists (prevents flicker)
    const session = await getAdminSession();
    if (session) passwordModal.style.display = 'none';

    db.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && !adminInitialized) {
            adminInitialized = true;
            passwordModal.style.display = 'none';
            adminContent.style.display = 'block';
            logoutBtn.style.display = 'inline-flex';
            initAdmin();
        }
        if (event === 'SIGNED_OUT') {
            adminInitialized = false;
            passwordModal.style.display = 'flex';
            adminContent.style.display = 'none';
            logoutBtn.style.display = 'none';
        }
    });

    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('password-error');
        const successEl = document.getElementById('signup-success');
        errorEl.style.display = 'none';
        successEl.style.display = 'none';
        loginBtn.disabled = true;
        loginBtn.textContent = currentAuthMode === 'login' ? 'Signing in...' : 'Signing up...';
        try {
            if (currentAuthMode === 'login') {
                await adminSignIn(emailInput.value.trim(), passwordInput.value);
            } else {
                await signUp(emailInput.value.trim(), passwordInput.value);
                successEl.style.display = 'block';
                emailInput.value = '';
                passwordInput.value = '';
            }
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
            passwordInput.value = '';
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = currentAuthMode === 'login' ? 'Log In' : 'Sign Up';
        }
    });

    if (new URLSearchParams(window.location.search).get('signup') === 'true') {
        setAuthMode('signup');
    }
});

async function handleLogout() {
    try { await adminSignOut(); }
    catch (err) { alert('Logout failed: ' + err.message); }
}

function initAdmin() {
    setupCreateForm();
    setupImagePreview();
    setupSurveyTypeToggle();
    setupCopyButton();
}

function setupCopyButton() {
    document.getElementById('copy-link-btn').addEventListener('click', () => {
        const linkInput = document.getElementById('survey-link-input');
        linkInput.select();
        navigator.clipboard.writeText(linkInput.value).then(() => {
            const btn = document.getElementById('copy-link-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    });
}

function setupSurveyTypeToggle() {
    const typeSelect = document.getElementById('survey-type');
    const imageFields = document.getElementById('image-fields');
    const mcFields = document.getElementById('multiple-choice-fields');
    const cbFields = document.getElementById('checkbox-fields');

    // Initialize with 4 choices
    initializeMCChoices();
    initializeCBChoices();

    typeSelect.addEventListener('change', () => {
        imageFields.style.display = 'none';
        mcFields.style.display = 'none';
        cbFields.style.display = 'none';

        if (typeSelect.value === 'image') {
            imageFields.style.display = 'block';
        } else if (typeSelect.value === 'multiple_choice') {
            mcFields.style.display = 'block';
        } else if (typeSelect.value === 'checkbox') {
            cbFields.style.display = 'block';
        }
    });
}

let mcChoiceCount = 0;
let cbChoiceCount = 0;

function initializeMCChoices() {
    const container = document.getElementById('mc-choices-container');
    container.innerHTML = '';
    mcChoiceCount = 0;
    for (let i = 0; i < 4; i++) {
        addMCChoice();
    }
}

function initializeCBChoices() {
    const container = document.getElementById('cb-choices-container');
    container.innerHTML = '';
    cbChoiceCount = 0;
    for (let i = 0; i < 4; i++) {
        addCBChoice();
    }
}

function addMCChoice() {
    const container = document.getElementById('mc-choices-container');
    const wrapper = document.createElement('div');
    wrapper.className = 'flex gap-2 items-center';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'mc-choice-input flex-1 px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 transition-colors';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded-lg transition-colors text-lg font-medium shrink-0';
    removeBtn.onclick = () => {
        if (document.querySelectorAll('.mc-choice-input').length > 2) {
            wrapper.remove();
            renumberMCChoices();
        } else {
            alert('You must have at least 2 choices.');
        }
    };

    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
    renumberMCChoices();
}

function renumberMCChoices() {
    const inputs = document.querySelectorAll('.mc-choice-input');
    inputs.forEach((input, index) => {
        input.placeholder = `Choice ${index + 1}`;
    });
}

function addCBChoice() {
    const container = document.getElementById('cb-choices-container');
    const wrapper = document.createElement('div');
    wrapper.className = 'flex gap-2 items-center';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cb-choice-input flex-1 px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 transition-colors';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded-lg transition-colors text-lg font-medium shrink-0';
    removeBtn.onclick = () => {
        if (document.querySelectorAll('.cb-choice-input').length > 2) {
            wrapper.remove();
            renumberCBChoices();
        } else {
            alert('You must have at least 2 options.');
        }
    };

    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
    renumberCBChoices();
}

function renumberCBChoices() {
    const inputs = document.querySelectorAll('.cb-choice-input');
    inputs.forEach((input, index) => {
        input.placeholder = `Option ${index + 1}`;
    });
}

function setupImagePreview() {
    const imageInput = document.getElementById('image-input');
    const preview = document.getElementById('upload-preview');
    const imageCount = document.getElementById('image-count');

    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (file && file.type.startsWith('image/')) {
            uploadedImages.push({ file, title: '' });
            renderImagePreviews();
        }
        imageInput.value = ''; // Reset input to allow adding same file again
    });

    function renderImagePreviews() {
        preview.innerHTML = '';
        uploadedImages.forEach((item, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'relative inline-block align-top text-center';

            const img = document.createElement('img');
            img.src = URL.createObjectURL(item.file);
            img.className = 'w-32 h-32 object-cover rounded-xl border-2 border-gray-200';
            img.onload = () => URL.revokeObjectURL(img.src);

            const titleInput = document.createElement('input');
            titleInput.type = 'text';
            titleInput.placeholder = 'Image title';
            titleInput.value = item.title;
            titleInput.className = 'block w-32 mt-1.5 px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-indigo-400';
            titleInput.oninput = (e) => {
                uploadedImages[index].title = e.target.value;
            };

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.className = 'absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer text-sm font-bold border-2 border-white';
            removeBtn.onclick = (e) => {
                e.preventDefault();
                uploadedImages.splice(index, 1);
                renderImagePreviews();
            };

            wrapper.appendChild(img);
            wrapper.appendChild(removeBtn);
            wrapper.appendChild(document.createElement('br'));
            wrapper.appendChild(titleInput);
            preview.appendChild(wrapper);
        });
        imageCount.textContent = `${uploadedImages.length} image${uploadedImages.length !== 1 ? 's' : ''} added`;
    }

    // Expose renderImagePreviews for form reset
    window.renderImagePreviews = renderImagePreviews;
}

function setupCreateForm() {
    const form = document.getElementById('create-survey-form');
    const createBtn = document.getElementById('create-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const surveyType = document.getElementById('survey-type').value;
        const title = document.getElementById('survey-title').value.trim();
        const description = document.getElementById('survey-description').value.trim();

        if (!title) {
            showMessage('Please enter a survey title.', 'error');
            return;
        }

        createBtn.disabled = true;
        createBtn.textContent = 'Creating...';

        try {
            let surveyId;
            if (surveyType === 'image') {
                surveyId = await createImageSurvey(title, description);
            } else if (surveyType === 'multiple_choice') {
                surveyId = await createMultipleChoiceSurvey(title, description);
            } else if (surveyType === 'checkbox') {
                surveyId = await createCheckboxSurvey(title, description);
            }

            // Show survey link
            const voteLink = `${window.location.origin}${window.location.pathname.replace('admin.html', '')}vote.html?id=${surveyId}`;
            document.getElementById('survey-link-input').value = voteLink;
            document.getElementById('survey-created-box').style.display = 'block';

            form.reset();
            uploadedImages = [];
            window.renderImagePreviews();
            initializeMCChoices();
            initializeCBChoices();

        } catch (err) {
            showMessage(`Error creating survey: ${err.message}`, 'error');
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = 'Create Survey';
        }
    });
}

async function createImageSurvey(title, description) {
    if (uploadedImages.length < 2) {
        throw new Error('Please add at least 2 images.');
    }

    const { data: { user } } = await db.auth.getUser();

    // Create survey
    const { data: survey, error: surveyError } = await db
        .from('surveys')
        .insert({ title, description, type: 'image', user_id: user.id })
        .select()
        .single();

    if (surveyError) throw surveyError;

    const surveyId = survey.id;

    // Upload images and create image records
    for (let i = 0; i < uploadedImages.length; i++) {
        const item = uploadedImages[i];
        const file = item.file;
        const imageTitle = item.title;
        const fileExt = file.name.split('.').pop();
        const fileName = `${survey.id}/${Date.now()}-${i}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await db.storage
            .from('survey-images')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = db.storage
            .from('survey-images')
            .getPublicUrl(fileName);

        // Create image record
        const { error: imageError } = await db
            .from('images')
            .insert({
                survey_id: survey.id,
                storage_path: fileName,
                image_url: urlData.publicUrl,
                title: imageTitle || null
            });

        if (imageError) throw imageError;
    }

    return surveyId;
}

async function createMultipleChoiceSurvey(title, description) {
    const question = document.getElementById('mc-question').value.trim();
    const choiceInputs = document.querySelectorAll('.mc-choice-input');
    const choices = Array.from(choiceInputs).map(input => input.value.trim()).filter(c => c);

    if (!question) {
        throw new Error('Please enter a question.');
    }

    if (choices.length < 2) {
        throw new Error('Please enter at least 2 answer choices.');
    }

    const surveyTitle = title || 'Multiple Choice Survey';

    const { data: { user } } = await db.auth.getUser();

    const { data: survey, error: surveyError } = await db
        .from('surveys')
        .insert({
            title: surveyTitle,
            description: description || null,
            question: question,
            type: 'multiple_choice',
            user_id: user.id
        })
        .select()
        .single();

    if (surveyError) throw surveyError;

    // Create "image" records for each choice (reusing images table)
    for (let i = 0; i < choices.length; i++) {
        const { error: choiceError } = await db
            .from('images')
            .insert({
                survey_id: survey.id,
                storage_path: '', // Empty for multiple choice
                image_url: '', // Empty for multiple choice
                title: choices[i]
            });

        if (choiceError) throw choiceError;
    }

    return survey.id;
}

async function createCheckboxSurvey(title, description) {
    const question = document.getElementById('cb-question').value.trim();
    const choiceInputs = document.querySelectorAll('.cb-choice-input');
    const choices = Array.from(choiceInputs).map(input => input.value.trim()).filter(c => c);

    if (!question) {
        throw new Error('Please enter a question.');
    }

    if (choices.length < 2) {
        throw new Error('Please enter at least 2 options.');
    }

    const surveyTitle = title || 'Checkbox Survey';

    const { data: { user } } = await db.auth.getUser();

    const { data: survey, error: surveyError } = await db
        .from('surveys')
        .insert({
            title: surveyTitle,
            description: description || null,
            question: question,
            type: 'checkbox',
            user_id: user.id
        })
        .select()
        .single();

    if (surveyError) throw surveyError;

    // Create "image" records for each option (reusing images table)
    for (let i = 0; i < choices.length; i++) {
        const { error: choiceError } = await db
            .from('images')
            .insert({
                survey_id: survey.id,
                storage_path: '', // Empty for checkbox
                image_url: '', // Empty for checkbox
                title: choices[i]
            });

        if (choiceError) throw choiceError;
    }

    return survey.id;
}

async function loadSurveys() {
    const loading = document.getElementById('surveys-loading');
    const list = document.getElementById('surveys-list');
    const noSurveys = document.getElementById('no-surveys');

    loading.style.display = 'block';
    list.style.display = 'none';
    noSurveys.style.display = 'none';

    try {
        const { data: surveys, error } = await db
            .from('surveys')
            .select('*')
            .order('created_at', { ascending: false });

        loading.style.display = 'none';

        if (error) throw error;

        if (!surveys || surveys.length === 0) {
            noSurveys.style.display = 'block';
            return;
        }

        list.innerHTML = '';
        list.style.display = 'block';

        for (const survey of surveys) {
            // Get vote count for this survey
            const { count } = await db
                .from('votes')
                .select('*', { count: 'exact', head: true })
                .eq('survey_id', survey.id);

            const li = document.createElement('li');
            li.className = 'survey-item';

            const voteLink = `${window.location.origin}${window.location.pathname.replace('admin.html', '')}vote.html?id=${survey.id}`;

            let surveyTypeLabel = 'Image';
            if (survey.type === 'multiple_choice') surveyTypeLabel = 'Multiple Choice';
            if (survey.type === 'checkbox') surveyTypeLabel = 'Checkbox';
            li.innerHTML = `
                <div>
                    <h3>${escapeHtml(survey.title)} <span style="font-size: 0.8rem; color: #888; font-weight: normal;">(${surveyTypeLabel})</span></h3>
                    <span class="date">Created: ${new Date(survey.created_at).toLocaleDateString()} | Votes: ${count || 0}</span>
                </div>
                <div class="actions">
                    <button class="btn btn-secondary btn-small" onclick="copyLink('${survey.id}')">Copy Link</button>
                    <a href="results.html?id=${survey.id}" class="btn btn-primary btn-small">Results</a>
                </div>
            `;
            list.appendChild(li);
        }
    } catch (err) {
        loading.innerHTML = `<p class="message message-error">Error loading surveys: ${err.message}</p>`;
    }
}

function copyLink(surveyId) {
    const voteLink = `${window.location.origin}${window.location.pathname.replace('admin.html', '')}vote.html?id=${surveyId}`;
    navigator.clipboard.writeText(voteLink).then(() => {
        showMessage('Vote link copied to clipboard!', 'success');
    }).catch(() => {
        showMessage('Failed to copy link. URL: ' + voteLink, 'info');
    });
}

function showMessage(text, type) {
    const container = document.getElementById('message-container');
    const classes = {
        success: 'bg-green-50 border border-green-200 text-green-700',
        error: 'bg-red-50 border border-red-200 text-red-700',
        info: 'bg-blue-50 border border-blue-200 text-blue-700'
    };
    const message = document.createElement('div');
    message.className = `rounded-xl px-4 py-3 text-sm font-medium ${classes[type] || classes.info}`;
    message.textContent = text;
    container.innerHTML = '';
    container.appendChild(message);

    setTimeout(() => {
        message.remove();
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
