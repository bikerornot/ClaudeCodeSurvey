// Admin functionality

// Store accumulated images with titles
let uploadedImages = []; // Array of { file, title }

document.addEventListener('DOMContentLoaded', () => {
    const passwordModal = document.getElementById('password-modal');
    const passwordForm = document.getElementById('password-form');
    const passwordInput = document.getElementById('password');
    const passwordError = document.getElementById('password-error');
    const adminContent = document.getElementById('admin-content');

    // Check if already authenticated
    if (sessionStorage.getItem('adminAuthenticated') === 'true') {
        passwordModal.style.display = 'none';
        adminContent.style.display = 'block';
        initAdmin();
    }

    // Password form submission
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (passwordInput.value === ADMIN_PASSWORD) {
            sessionStorage.setItem('adminAuthenticated', 'true');
            passwordModal.style.display = 'none';
            adminContent.style.display = 'block';
            initAdmin();
        } else {
            passwordError.style.display = 'block';
            passwordInput.value = '';
        }
    });
});

function initAdmin() {
    loadSurveys();
    setupCreateForm();
    setupImagePreview();
    setupSurveyTypeToggle();
}

function setupSurveyTypeToggle() {
    const typeSelect = document.getElementById('survey-type');
    const imageFields = document.getElementById('image-fields');
    const mcFields = document.getElementById('multiple-choice-fields');

    typeSelect.addEventListener('change', () => {
        if (typeSelect.value === 'image') {
            imageFields.style.display = 'block';
            mcFields.style.display = 'none';
        } else {
            imageFields.style.display = 'none';
            mcFields.style.display = 'block';
        }
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
            wrapper.style.cssText = 'position: relative; display: inline-block; vertical-align: top; margin: 5px; text-align: center;';

            const img = document.createElement('img');
            img.src = URL.createObjectURL(item.file);
            img.onload = () => URL.revokeObjectURL(img.src);

            const titleInput = document.createElement('input');
            titleInput.type = 'text';
            titleInput.placeholder = 'Image title';
            titleInput.value = item.title;
            titleInput.style.cssText = 'width: 100%; max-width: 150px; margin-top: 5px; padding: 5px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem;';
            titleInput.oninput = (e) => {
                uploadedImages[index].title = e.target.value;
            };

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.style.cssText = 'position: absolute; top: -8px; right: -8px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 16px; line-height: 1;';
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
            if (surveyType === 'image') {
                await createImageSurvey(title, description);
            } else {
                await createMultipleChoiceSurvey(title, description);
            }

            showMessage('Survey created successfully!', 'success');
            form.reset();
            uploadedImages = [];
            window.renderImagePreviews();
            loadSurveys();

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

    // Create survey
    const { data: survey, error: surveyError } = await db
        .from('surveys')
        .insert({ title, description, type: 'image' })
        .select()
        .single();

    if (surveyError) throw surveyError;

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
}

async function createMultipleChoiceSurvey(title, description) {
    const question = document.getElementById('mc-question').value.trim();
    const choices = [
        document.getElementById('mc-choice-1').value.trim(),
        document.getElementById('mc-choice-2').value.trim(),
        document.getElementById('mc-choice-3').value.trim(),
        document.getElementById('mc-choice-4').value.trim()
    ].filter(c => c); // Remove empty choices

    if (!question) {
        throw new Error('Please enter a question.');
    }

    if (choices.length < 2) {
        throw new Error('Please enter at least 2 answer choices.');
    }

    const surveyTitle = title || 'Multiple Choice Survey';

    const { data: survey, error: surveyError } = await db
        .from('surveys')
        .insert({
            title: surveyTitle,
            description: description || null,
            question: question,
            type: 'multiple_choice'
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

            const surveyTypeLabel = survey.type === 'multiple_choice' ? 'Multiple Choice' : 'Image';
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
    const message = document.createElement('div');
    message.className = `message message-${type}`;
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
