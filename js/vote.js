// Voting functionality

let selectedImageId = null;
let selectedImageIds = []; // For checkbox surveys
let surveyId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Get survey ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    surveyId = urlParams.get('id');

    if (!surveyId) {
        showError('No survey ID provided. Please use a valid survey link.');
        return;
    }

    // Check if already voted
    if (hasVoted(surveyId)) {
        showAlreadyVoted();
        return;
    }

    // Load survey
    await loadSurvey();
    setupVoteActions();
});

async function loadSurvey() {
    const loading = document.getElementById('loading');
    const container = document.getElementById('survey-container');

    try {
        // Fetch survey
        const { data: survey, error: surveyError } = await db
            .from('surveys')
            .select('*')
            .eq('id', surveyId)
            .single();

        if (surveyError) throw surveyError;
        if (!survey) throw new Error('Survey not found');

        // Fetch images
        const { data: images, error: imagesError } = await db
            .from('images')
            .select('*')
            .eq('survey_id', surveyId)
            .order('created_at', { ascending: true });

        if (imagesError) throw imagesError;

        loading.style.display = 'none';
        container.style.display = 'block';

        // Set title and description
        document.getElementById('survey-title').textContent = survey.title;
        const descEl = document.getElementById('survey-description');
        if (survey.description) {
            descEl.textContent = survey.description;
        } else {
            descEl.style.display = 'none';
        }

        // Set question for multiple choice and checkbox surveys
        const questionEl = document.getElementById('survey-question');
        if ((survey.type === 'multiple_choice' || survey.type === 'checkbox') && survey.question) {
            questionEl.textContent = survey.question;
            questionEl.style.display = 'block';
        } else {
            questionEl.style.display = 'none';
        }

        // Set instruction text based on survey type
        const instructionEl = document.getElementById('survey-instruction');
        if (survey.type === 'multiple_choice') {
            instructionEl.textContent = 'Select your answer:';
        } else if (survey.type === 'checkbox') {
            instructionEl.textContent = 'Select all that apply:';
        } else {
            instructionEl.textContent = 'Click on an image to vote for it';
        }

        // Render images, multiple choice, or checkboxes
        const grid = document.getElementById('image-grid');
        grid.innerHTML = '';

        if (survey.type === 'multiple_choice') {
            // Render as multiple choice buttons
            grid.className = 'multiple-choice-grid';
            images.forEach(choice => {
                const button = document.createElement('button');
                button.className = 'choice-button';
                button.dataset.imageId = choice.id;
                button.textContent = choice.title;
                button.addEventListener('click', () => selectChoice(choice.id, choice.title));
                grid.appendChild(button);
            });
        } else if (survey.type === 'checkbox') {
            // Render as checkboxes
            grid.className = 'checkbox-grid';
            images.forEach(option => {
                const label = document.createElement('label');
                label.className = 'checkbox-label';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'checkbox-input';
                checkbox.dataset.imageId = option.id;
                checkbox.addEventListener('change', () => updateCheckboxSelection());

                const span = document.createElement('span');
                span.textContent = option.title;

                label.appendChild(checkbox);
                label.appendChild(span);
                grid.appendChild(label);
            });
        } else {
            // Render as image grid
            grid.className = 'image-grid';
            images.forEach(image => {
                const card = document.createElement('div');
                card.className = 'image-card';
                card.dataset.imageId = image.id;
                card.innerHTML = `
                    <img src="${image.image_url}" alt="${image.title || 'Survey option'}">
                    ${image.title ? `<div class="image-title">${escapeHtml(image.title)}</div>` : ''}
                `;
                card.addEventListener('click', () => selectImage(image.id, image.image_url));
                grid.appendChild(card);
            });
        }

    } catch (err) {
        showError(`Error loading survey: ${err.message}`);
    }
}

function selectImage(imageId, imageUrl) {
    // Remove previous selection
    document.querySelectorAll('.image-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Select new image
    const selectedCard = document.querySelector(`.image-card[data-image-id="${imageId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }

    selectedImageId = imageId;

    // Show vote actions
    const actions = document.getElementById('vote-actions');
    const preview = document.getElementById('selected-preview');
    preview.src = imageUrl;
    preview.style.display = 'block';
    actions.style.display = 'block';
}

function selectChoice(choiceId, choiceText) {
    // Remove previous selection
    document.querySelectorAll('.choice-button').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Select new choice
    const selectedBtn = document.querySelector(`.choice-button[data-image-id="${choiceId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }

    selectedImageId = choiceId;

    // Show vote actions (hide preview for multiple choice)
    const actions = document.getElementById('vote-actions');
    const preview = document.getElementById('selected-preview');
    preview.style.display = 'none';
    document.querySelector('#vote-actions p').textContent = `Selected: ${choiceText}`;
    actions.style.display = 'block';
}

function updateCheckboxSelection() {
    const checkboxes = document.querySelectorAll('.checkbox-input:checked');
    selectedImageIds = Array.from(checkboxes).map(cb => cb.dataset.imageId);

    const actions = document.getElementById('vote-actions');
    const preview = document.getElementById('selected-preview');
    preview.style.display = 'none';

    if (selectedImageIds.length > 0) {
        document.querySelector('#vote-actions p').textContent = `Selected ${selectedImageIds.length} option${selectedImageIds.length !== 1 ? 's' : ''}`;
        actions.style.display = 'block';
    } else {
        actions.style.display = 'none';
    }
}

function setupVoteActions() {
    const submitBtn = document.getElementById('submit-vote');
    const cancelBtn = document.getElementById('cancel-vote');

    submitBtn.addEventListener('click', submitVote);
    cancelBtn.addEventListener('click', cancelSelection);
}

async function submitVote() {
    const submitBtn = document.getElementById('submit-vote');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        // Check if this is a checkbox survey (multiple selections)
        const checkboxInputs = document.querySelectorAll('.checkbox-input');

        if (checkboxInputs.length > 0) {
            // Checkbox survey - submit multiple votes
            if (selectedImageIds.length === 0) {
                throw new Error('Please select at least one option');
            }

            for (const imageId of selectedImageIds) {
                const { error } = await db
                    .from('votes')
                    .insert({
                        survey_id: surveyId,
                        image_id: imageId
                    });

                if (error) throw error;
            }
        } else {
            // Single choice survey
            if (!selectedImageId) return;

            const { error } = await db
                .from('votes')
                .insert({
                    survey_id: surveyId,
                    image_id: selectedImageId
                });

            if (error) throw error;
        }

        // Save to localStorage
        saveVote(surveyId);

        // Show thank you message
        showThankYou();

    } catch (err) {
        alert(`Error submitting vote: ${err.message}`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Vote';
    }
}

function cancelSelection() {
    selectedImageId = null;
    selectedImageIds = [];
    document.querySelectorAll('.image-card, .choice-button').forEach(el => {
        el.classList.remove('selected');
    });
    document.querySelectorAll('.checkbox-input').forEach(cb => {
        cb.checked = false;
    });
    document.getElementById('vote-actions').style.display = 'none';
    document.querySelector('#vote-actions p').textContent = 'Selected image:';
}

function hasVoted(surveyId) {
    const votes = JSON.parse(localStorage.getItem('surveyVotes') || '{}');
    return votes[surveyId] === true;
}

function saveVote(surveyId) {
    const votes = JSON.parse(localStorage.getItem('surveyVotes') || '{}');
    votes[surveyId] = true;
    localStorage.setItem('surveyVotes', JSON.stringify(votes));
}

function showAlreadyVoted() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('already-voted').style.display = 'block';
    document.getElementById('view-results-link').href = `results.html?id=${surveyId}`;
}

function showThankYou() {
    document.getElementById('survey-container').style.display = 'none';
    document.getElementById('thank-you').style.display = 'block';
}

function showError(message) {
    document.getElementById('loading').style.display = 'none';
    const errorContainer = document.getElementById('error-container');
    errorContainer.style.display = 'block';
    errorContainer.innerHTML = `<div class="card message message-error">${message}</div>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
