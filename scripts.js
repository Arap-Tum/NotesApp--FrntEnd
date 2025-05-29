
        // App state
        let notes = [];
        let currentEditingNote = null;
        let deleteNoteId = null;
        let autoSaveEnabled = true;
        let autoSaveTimeouts = {};

        // API configuration - Update this when you deploy your backend
        const API_BASE_URL = 'https://notesapp-backend-lxak.onrender.com/api/notes';

        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            loadNotes();
            setupEventListeners();
            
            // Load from localStorage as fallback
            const savedNotes = localStorage.getItem('notes');
            if (savedNotes) {
                notes = JSON.parse(savedNotes);
                renderNotes();
            }
        });

        function setupEventListeners() {
            document.getElementById('searchInput').addEventListener('input', filterNotes);
            document.getElementById('categoryFilter').addEventListener('change', filterNotes);
            document.getElementById('sortFilter').addEventListener('change', filterNotes);
            document.getElementById('noteForm').addEventListener('submit', saveNote);
        }

        // API functions
        async function loadNotes() {
            try {
                const response = await fetch(API_BASE_URL);
                if (response.ok) {
                    notes = await response.json();
                    renderNotes();
                } else {
                    console.log('Backend not available, using local storage');
                    loadFromLocalStorage();
                }
            } catch (error) {
                console.log('Backend not available, using local storage');
                loadFromLocalStorage();
            }
        }

        async function createNoteAPI(noteData) {
            try {
                const response = await fetch(API_BASE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(noteData)
                });
                if (response.ok) {
                    const result = await response.json();
                    return result.note;
                }
            } catch (error) {
                console.log('API not available, saving locally');
            }
            return null;
        }

        async function updateNoteAPI(id, noteData) {
            try {
                const response = await fetch(`${API_BASE_URL}/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(noteData)
                });
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                console.log('API not available, updating locally');
            }
            return null;
        }

        async function deleteNoteAPI(id) {
            try {
                const response = await fetch(`${API_BASE_URL}/${id}`, {
                    method: 'DELETE'
                });
                return response.ok;
            } catch (error) {
                console.log('API not available, deleting locally');
            }
            return false;
        }

        // Local storage functions
        function saveToLocalStorage() {
            localStorage.setItem('notes', JSON.stringify(notes));
        }

        function loadFromLocalStorage() {
            const savedNotes = localStorage.getItem('notes');
            if (savedNotes) {
                notes = JSON.parse(savedNotes);
            } else {
                // Sample data for demo
                notes = [
                    {
                        _id: '1',
                        title: 'Welcome to NotesApp!',
                        content: 'This is your modern note-taking app. You can create, edit, and organize your notes with categories and tags.',
                        category: 'Personal',
                        tags: ['welcome', 'demo'],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        _id: '2',
                        title: 'Features Overview',
                        content: '• Auto-save functionality\n• Search and filter notes\n• Categories and tags\n• Export functionality\n• Mobile responsive design',
                        category: 'Ideas',
                        tags: ['features', 'overview'],
                        createdAt: new Date(Date.now() - 86400000).toISOString(),
                        updatedAt: new Date(Date.now() - 86400000).toISOString()
                    }
                ];
                saveToLocalStorage();
            }
            renderNotes();
        }

        // Note operations
        function openCreateModal() {
            currentEditingNote = null;
            document.getElementById('modalTitle').textContent = 'Create New Note';
            document.getElementById('noteForm').reset();
            document.getElementById('noteModal').style.display = 'block';
        }

        function editNote(id) {
            const note = notes.find(n => n._id === id);
            if (note) {
                currentEditingNote = note;
                document.getElementById('modalTitle').textContent = 'Edit Note';
                document.getElementById('noteTitle').value = note.title;
                document.getElementById('noteCategory').value = note.category || 'Personal';
                document.getElementById('noteTags').value = note.tags ? note.tags.join(', ') : '';
                document.getElementById('noteContent').value = note.content;
                document.getElementById('noteModal').style.display = 'block';
            }
        }

        async function saveNote(e) {
            e.preventDefault();
            
            const title = document.getElementById('noteTitle').value;
            const category = document.getElementById('noteCategory').value;
            const tags = document.getElementById('noteTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
            const content = document.getElementById('noteContent').value;
            
            const noteData = {
                title,
                content,
                category,
                tags
            };

            if (currentEditingNote) {
                // Update existing note
                const updatedNote = await updateNoteAPI(currentEditingNote._id, noteData);
                if (updatedNote) {
                    const index = notes.findIndex(n => n._id === currentEditingNote._id);
                    notes[index] = updatedNote;
                } else {
                    // Update locally
                    const index = notes.findIndex(n => n._id === currentEditingNote._id);
                    notes[index] = {
                        ...notes[index],
                        ...noteData,
                        updatedAt: new Date().toISOString()
                    };
                }
            } else {
                // Create new note
                const newNote = await createNoteAPI(noteData);
                if (newNote) {
                    notes.unshift(newNote);
                } else {
                    // Create locally
                    const localNote = {
                        _id: Date.now().toString(),
                        ...noteData,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    notes.unshift(localNote);
                }
            }

            saveToLocalStorage();
            renderNotes();
            closeModal();
            showAutoSaveIndicator();
        }

        function saveNoteInline(id) {
            const noteCard = document.querySelector(`[data-note-id="${id}"]`);
            const title = noteCard.querySelector('.note-title').value;
            const content = noteCard.querySelector('.note-content').value;
            
            const noteIndex = notes.findIndex(n => n._id === id);
            if (noteIndex !== -1) {
                notes[noteIndex].title = title;
                notes[noteIndex].content = content;
                notes[noteIndex].updatedAt = new Date().toISOString();
                
                // Update via API
                updateNoteAPI(id, { title, content });
                
                saveToLocalStorage();
                showAutoSaveIndicator();
            }
        }

        function deleteNote(id) {
            deleteNoteId = id;
            document.getElementById('deleteModal').style.display = 'block';
        }

        async function confirmDelete() {
            if (deleteNoteId) {
                const deleted = await deleteNoteAPI(deleteNoteId);
                
                notes = notes.filter(n => n._id !== deleteNoteId);
                saveToLocalStorage();
                renderNotes();
                closeDeleteModal();
                showAutoSaveIndicator();
            }
        }

        // Auto-save functionality
        function setupAutoSave(noteId) {
            const noteCard = document.querySelector(`[data-note-id="${noteId}"]`);
            const titleInput = noteCard.querySelector('.note-title');
            const contentInput = noteCard.querySelector('.note-content');

            [titleInput, contentInput].forEach(input => {
                input.addEventListener('input', () => {
                    if (autoSaveEnabled) {
                        clearTimeout(autoSaveTimeouts[noteId]);
                        autoSaveTimeouts[noteId] = setTimeout(() => {
                            saveNoteInline(noteId);
                        }, 2000);
                    }
                });
            });
        }

        function toggleAutoSave() {
            autoSaveEnabled = !autoSaveEnabled;
            document.getElementById('autoSaveText').textContent = 
                `🔄 Auto-Save: ${autoSaveEnabled ? 'ON' : 'OFF'}`;
        }

        function showAutoSaveIndicator() {
            const indicator = document.getElementById('autoSaveIndicator');
            indicator.classList.add('show');
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 2000);
        }

        // Rendering and filtering
        function renderNotes() {
            const grid = document.getElementById('notesGrid');
            const emptyState = document.getElementById('emptyState');
            
            if (notes.length === 0) {
                grid.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }
            
            grid.style.display = 'grid';
            emptyState.style.display = 'none';
            
            grid.innerHTML = notes.map(note => `
                <div class="note-card" data-note-id="${note._id}">
                    <div class="note-header">
                        <input type="text" class="note-title" value="${note.title}" 
                               onblur="saveNoteInline('${note._id}')">
                        <div class="note-actions">
                            <button class="action-btn save-btn" onclick="saveNoteInline('${note._id}')">
                                💾
                            </button>
                            <button class="action-btn delete-btn" onclick="deleteNote('${note._id}')">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <textarea class="note-content" onblur="saveNoteInline('${note._id}')">${note.content}</textarea>
                    <div class="note-meta">
                        <div>
                            <span class="category-badge">${note.category || 'Personal'}</span>
                            <div class="note-tags">
                                ${(note.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        </div>
                        <div class="note-timestamp">
                            ${formatDate(note.updatedAt || note.createdAt)}
                        </div>
                    </div>
                </div>
            `).join('');

            // Setup auto-save for each note
            notes.forEach(note => {
                setupAutoSave(note._id);
            });
        }

        function filterNotes() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const categoryFilter = document.getElementById('categoryFilter').value;
            const sortFilter = document.getElementById('sortFilter').value;

            let filteredNotes = [...notes];

            // Apply search filter
            if (searchTerm) {
                filteredNotes = filteredNotes.filter(note => 
                    note.title.toLowerCase().includes(searchTerm) ||
                    note.content.toLowerCase().includes(searchTerm) ||
                    (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
                );
            }

            // Apply category filter
            if (categoryFilter) {
                filteredNotes = filteredNotes.filter(note => note.category === categoryFilter);
            }

            // Apply sorting
            switch (sortFilter) {
                case 'newest':
                    filteredNotes.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
                    break;
                case 'oldest':
                    filteredNotes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    break;
                case 'title':
                    filteredNotes.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'category':
                    filteredNotes.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
                    break;
            }

            // Temporarily replace notes for rendering
            const originalNotes = notes;
            notes = filteredNotes;
            renderNotes();
            notes = originalNotes;
        }

        // Utility functions
        function formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return 'Just now';
            if (minutes < 60) return `${minutes}m ago`;
            if (hours < 24) return `${hours}h ago`;
            if (days < 7) return `${days}d ago`;
            return date.toLocaleDateString();
        }

        function exportNotes() {
            const dataStr = JSON.stringify(notes, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `notes-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showAutoSaveIndicator();
        }

        // Modal functions
        function closeModal() {
            document.getElementById('noteModal').style.display = 'none';
            currentEditingNote = null;
        }

        function closeDeleteModal() {
            document.getElementById('deleteModal').style.display = 'none';
            deleteNoteId = null;
        }

        // Close modals when clicking outside
        window.onclick = function(event) {
            const noteModal = document.getElementById('noteModal');
            const deleteModal = document.getElementById('deleteModal');
            
            if (event.target === noteModal) {
                closeModal();
            }
            if (event.target === deleteModal) {
                closeDeleteModal();
            }
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + N for new note
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                openCreateModal();
            }
            
            // Ctrl/Cmd + S for save (when modal is open)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                const modal = document.getElementById('noteModal');
                if (modal.style.display === 'block') {
                    e.preventDefault();
                    document.getElementById('noteForm').dispatchEvent(new Event('submit'));
                }
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                closeModal();
                closeDeleteModal();
            }
        });
  