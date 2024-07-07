let currentPage = 1;
let totalPages = 1;

function updateCharCount() {
    const content = document.getElementById('noteContent').value;
    const charCount = content.length;
    const charCountElement = document.getElementById('charCount');
    charCountElement.textContent = `${charCount} / 500 characters`;
    charCountElement.className = charCount > 500 || charCount === 0 ? 'char-count error' : 'char-count';
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
            <div class="note">
                <p>${note.content}</p>
                <small>Created: ${new Date(note.created_at).toLocaleString()}</small>
                <span class="char-count">(${note.charCount} characters)</span>
                <span class="delete-btn" data-id="${note.$loki}">Delete</span>
            </div>
        `).join('');

        document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages} (Total notes: ${totalNotes})`;

        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteNote(this.getAttribute('data-id'));
            });
        });
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
            <div class="note">
                <p>${note.content}</p>
                <small>Created: ${new Date(note.created_at).toLocaleString()}</small>
                <span class="char-count">(${note.charCount} characters)</span>
            </div>
        `).join('');
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Failed to search notes. Please try again.');
    });
}

// Add event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById('noteContent').addEventListener('input', updateCharCount);
    document.getElementById('saveNote').addEventListener('click', addNote);
    document.getElementById('searchButton').addEventListener('click', searchNotes);
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
    document.getElementById('searchQuery').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission
            searchNotes();
        }
    });

    fetchNotes(); // Load first page of notes on page load
});