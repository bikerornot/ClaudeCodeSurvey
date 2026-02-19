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
            const isWinner = index === 0 && count > 0;

            const resultItem = document.createElement('div');

            if (survey.type === 'multiple_choice' || survey.type === 'checkbox') {
                // Text-based result (no image)
                resultItem.innerHTML = `
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                ${isWinner ? '<span class="text-yellow-500 text-lg">🏆</span>' : ''}
                                <span class="font-semibold text-gray-800">${escapeHtml(imageLabel)}</span>
                            </div>
                            <span class="text-sm text-gray-500">${count} vote${count !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-end pr-2 transition-all duration-500" style="width: ${Math.max(percentage, 0)}%; min-width: ${percentage > 0 ? '2rem' : '0'}">
                                <span class="text-white text-xs font-semibold">${percentage}%</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Image survey result
                resultItem.innerHTML = `
                    <div class="flex items-start gap-4">
                        <img src="${image.image_url}" alt="${escapeHtml(imageLabel)}" class="w-24 h-24 object-cover rounded-xl shrink-0">
                        <div class="flex-1">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    ${isWinner ? '<span class="text-yellow-500 text-lg">🏆</span>' : ''}
                                    <span class="font-semibold text-gray-800">${escapeHtml(imageLabel)}</span>
                                </div>
                                <span class="text-sm text-gray-500">${count} vote${count !== 1 ? 's' : ''}</span>
                            </div>
                            <div class="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                                <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-end pr-2 transition-all duration-500" style="width: ${Math.max(percentage, 0)}%; min-width: ${percentage > 0 ? '2rem' : '0'}">
                                    <span class="text-white text-xs font-semibold">${percentage}%</span>
                                </div>
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
    errorContainer.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center">${message}</div>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
