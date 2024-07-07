let currentPage = 1;
let totalPages = 1;

function updateCharCount() {
    const content = document.getElementById('noteContent').value;
    const charCount = content.length;
    const charCountElement = document.getElementById('charCount');
    charCountElement.textContent = `${charCount} / 500 characters`;
}

function addNote() {
    const content = document.getElementById('noteContent').value.trim();
    if (content.length === 0) {
        showError('Note content cannot be empty.');
        return;
    }
    if (content.length > 500) {
        showError('Note content cannot exceed 500 characters.');
        return;
    }
    console.log('Sending note:', content);
    fetch('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Note saved:', data);
        document.getElementById('noteContent').value = '';
        noteContentField.foundation.activateFocus(); // Reset the floating label
        updateCharCount();
        fetchNotes(1);
        showError('');
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Failed to save note. Please try again.');
    });
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = message ? 'block' : 'none';
}

function fetchNotes(page = 1) {
    console.log('Fetching notes, page:', page);
    fetch(`http://localhost:3000/api/notes?page=${page}`)
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Fetched notes:', data);
        const { notes, currentPage: fetchedPage, totalPages: fetchedTotalPages, totalNotes } = data;
        currentPage = fetchedPage;
        totalPages = fetchedTotalPages;
        const notesList = document.getElementById('notesList');
        notesList.innerHTML = notes.map(note => `
            <div class="mdc-card note">
                <div class="mdc-card__content">
                    <p class="mdc-typography--body1">${note.content}</p>
                    <p class="mdc-typography--caption">Created: ${new Date(note.created_at).toLocaleString()}</p>
                    <p class="mdc-typography--caption">${note.charCount} characters</p>
                </div>
                <div class="mdc-card__actions">
                    <button class="mdc-button mdc-card__action mdc-card__action--button" onclick="deleteNote(${note.$loki})">
                        <div class="mdc-button__ripple"></div>
                        <span class="mdc-button__label">Delete</span>
                    </button>
                </div>
            </div>
        `).join('');

        document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages} (Total notes: ${totalNotes})`;
    })
    .catch(error => {
        console.error('Error fetching notes:', error);
        showError('Failed to fetch notes. Please try again.');
    });
}

function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        fetchNotes(newPage);
    }
}

function deleteNote(id) {
    fetch(`http://localhost:3000/api/notes/${id}`, { method: 'DELETE' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(() => {
            fetchNotes(currentPage);
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Failed to delete note. Please try again.');
        });
}

function searchNotes() {
    const query = document.getElementById('searchQuery').value;
    fetch('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(results => {
        const searchResults = document.getElementById('searchResults');
        searchResults.innerHTML = results.map(note => `
            <div class="mdc-card note">
                <div class="mdc-card__content">
                    <p class="mdc-typography--body1">${note.content}</p>
                    <p class="mdc-typography--caption">Created: ${new Date(note.created_at).toLocaleString()}</p>
                    <p class="mdc-typography--caption">${note.charCount} characters</p>
                </div>
            </div>
        `).join('');
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Failed to search notes. Please try again.');
    });
}

let noteContentField, searchQueryField;

// Initialize Material Components
document.addEventListener('DOMContentLoaded', function() {
    mdc.autoInit();
    
    noteContentField = new mdc.textField.MDCTextField(document.querySelector('.mdc-text-field--textarea'));
    searchQueryField = new mdc.textField.MDCTextField(document.querySelector('.mdc-text-field--outlined'));
    const saveNoteButton = new mdc.ripple.MDCRipple(document.querySelector('#saveNote'));
    const searchButton = new mdc.ripple.MDCRipple(document.querySelector('#searchButton'));
    const prevPageButton = new mdc.ripple.MDCRipple(document.querySelector('#prevPage'));
    const nextPageButton = new mdc.ripple.MDCRipple(document.querySelector('#nextPage'));

    document.getElementById('noteContent').addEventListener('input', updateCharCount);
    saveNoteButton.listen('click', addNote);
    searchButton.listen('click', searchNotes);
    prevPageButton.listen('click', () => changePage(-1));
    nextPageButton.listen('click', () => changePage(1));
    document.getElementById('searchQuery').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            searchNotes();
        }
    });

    fetchNotes();
});