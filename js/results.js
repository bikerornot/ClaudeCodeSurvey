// Results functionality

let surveyId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Get survey ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    surveyId = urlParams.get('id');

    if (!surveyId) {
        showError('No survey ID provided. Please use a valid results link.');
        return;
    }

    await loadResults();
    setupRefresh();
});

async function loadResults() {
    const loading = document.getElementById('loading');
    const container = document.getElementById('results-container');

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

        // Fetch all votes for this survey
        const { data: votes, error: votesError } = await db
            .from('votes')
            .select('image_id')
            .eq('survey_id', surveyId);

        if (votesError) throw votesError;

        // Calculate vote counts
        const voteCounts = {};
        votes.forEach(vote => {
            voteCounts[vote.image_id] = (voteCounts[vote.image_id] || 0) + 1;
        });

        const totalVotes = votes.length;

        loading.style.display = 'none';
        container.style.display = 'block';

        // Set title, description, question, and total
        document.getElementById('survey-title').textContent = survey.title;
        const descEl = document.getElementById('survey-description');
        if (survey.description) {
            descEl.textContent = survey.description;
        } else {
            descEl.style.display = 'none';
        }

        // Set question for multiple choice surveys
        const questionEl = document.getElementById('survey-question');
        if (survey.type === 'multiple_choice' && survey.question) {
            questionEl.textContent = survey.question;
            questionEl.style.display = 'block';
        } else {
            questionEl.style.display = 'none';
        }

        document.getElementById('total-votes').textContent = totalVotes;

        // Render results
        const resultsList = document.getElementById('results-list');
        resultsList.innerHTML = '';

        // Sort images by vote count (descending)
        const sortedImages = [...images].sort((a, b) => {
            return (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0);
        });

        sortedImages.forEach((image, index) => {
            const count = voteCounts[image.id] || 0;
            const percentage = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : 0;
            const imageLabel = image.title || `Option ${index + 1}`;

            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';

            if (survey.type === 'multiple_choice' || survey.type === 'checkbox') {
                // Multiple choice or checkbox result (no image)
                resultItem.innerHTML = `
                    <div style="padding: 15px;">
                        <div style="font-weight: 600; margin-bottom: 10px; font-size: 1.1rem;">${escapeHtml(imageLabel)}</div>
                        <div class="result-bar-container">
                            <div class="result-bar" style="width: ${Math.max(percentage, 0)}%;">
                                ${percentage}%
                            </div>
                        </div>
                        <div class="result-stats">
                            <span>${count} vote${count !== 1 ? 's' : ''}</span>
                            <span>${percentage}%</span>
                        </div>
                    </div>
                `;
            } else {
                // Image survey result
                resultItem.innerHTML = `
                    <div style="display: flex; align-items: flex-start; gap: 20px;">
                        <img src="${image.image_url}" alt="${escapeHtml(imageLabel)}">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 5px;">${escapeHtml(imageLabel)}</div>
                            <div class="result-bar-container">
                                <div class="result-bar" style="width: ${Math.max(percentage, 0)}%;">
                                    ${percentage}%
                                </div>
                            </div>
                            <div class="result-stats">
                                <span>${count} vote${count !== 1 ? 's' : ''}</span>
                                <span>${percentage}%</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            resultsList.appendChild(resultItem);
        });

    } catch (err) {
        showError(`Error loading results: ${err.message}`);
    }
}

function setupRefresh() {
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
        await loadResults();
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh Results';
    });
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
