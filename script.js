document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const pianoKeyboard = document.getElementById('piano-keyboard');
    const scaleList = document.getElementById('scale-list');
    const scaleFilterInput = document.getElementById('scale-filter');
    const sortAscButton = document.getElementById('sort-asc');
    const sortDescButton = document.getElementById('sort-desc');
    const scaleListTitle = document.getElementById('scale-list-title');
    const selectedNotesField = document.getElementById('selected-notes-field');
    const clearSelectionButton = document.getElementById('clear-selection'); // Get Clear Button

    const playChordButton = document.getElementById('play-chord');
    const playArpUpButton = document.getElementById('play-arp-up');
    const playArpDownButton = document.getElementById('play-arp-down');
    const playbackSpeedInput = document.getElementById('playback-speed');
    const arpFromRootCheckbox = document.getElementById('arp-from-root');

    const enharmonicRadios = document.querySelectorAll('input[name="enharmonic"]'); // Get radio buttons
    const themeToggleButton = document.getElementById('theme-toggle');
    const viewToggleButton = document.getElementById('view-toggle');
    const piano3dContainer = document.getElementById('piano-3d');
    const piano3dHint = document.getElementById('piano-3d-hint');

    // --- Data ---
    const notesOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteFrequencies = { // Frequencies for octave 4 (Middle C = C4)
        'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13, 'E': 329.63,
        'F': 349.23, 'F#': 369.99, 'G': 392.00, 'G#': 415.30, 'A': 440.00,
        'A#': 466.16, 'B': 493.88
    };

    // Enharmonic Mappings
    const sharpToFlat = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
    const flatToSharp = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
    // Basic map to ensure we store sharps internally (can be expanded if scale data uses flats)
    const noteNameToInternal = (name) => flatToSharp[name] || name;

    // Expanded Scale List (99 scales, maybe I'll add more later if I can be bothered)
    const scales = [
        // --- Major Scales & Modes (Diatonic) ---
        { name: 'C Major (Ionian)', notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
        { name: 'G Major (Ionian)', notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'] },
        { name: 'D Major (Ionian)', notes: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'] },
        { name: 'A Major (Ionian)', notes: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'] },
        { name: 'E Major (Ionian)', notes: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'] },
        { name: 'B Major (Ionian)', notes: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'] },
        { name: 'F# Major (Ionian)', notes: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'F'] }, // F is E#
        { name: 'C# Major (Ionian)', notes: ['C#', 'D#', 'F', 'F#', 'G#', 'A#', 'C'] }, // F is E#, C is B#
        { name: 'F Major (Ionian)', notes: ['F', 'G', 'A', 'A#', 'C', 'D', 'E'] }, // A# is Bb - Needs Enharmonic Correction in Data
        { name: 'Bb Major (Ionian)', notes: ['A#', 'C', 'D', 'D#', 'F', 'G', 'A'] }, // A# is Bb, D# is Eb - Needs Enharmonic Correction
        { name: 'Eb Major (Ionian)', notes: ['D#', 'F', 'G', 'G#', 'A#', 'C', 'D'] }, // D# is Eb, G# is Ab, A# is Bb - Needs Enharmonic Correction
        { name: 'Ab Major (Ionian)', notes: ['G#', 'A#', 'C', 'C#', 'D#', 'F', 'G'] }, // G# is Ab, A# is Bb, C# is Db, D# is Eb - Needs Enharmonic Correction
        { name: 'Db Major (Ionian)', notes: ['C#', 'D#', 'F', 'F#', 'G#', 'A#', 'C'] }, // C# is Db, D# is Eb, F# is Gb, G# is Ab, A# is Bb - Needs Enharmonic Correction
        { name: 'Gb Major (Ionian)', notes: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'F'] }, // F# is Gb, G# is Ab, A# is Bb, C# is Db, D# is Eb - Needs Enharmonic Correction
        { name: 'Cb Major (Ionian)', notes: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'] }, // Cb is B, etc. - Needs Enharmonic Correction

        // -- Natural Minor Scales (Aeolian) --

        { name: 'C Natural Minor', notes: ['C', 'D', 'D#', 'F', 'G', 'G#', 'A#'] },
        { name: 'C# Natural Minor', notes: ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'] },
        { name: 'D Natural Minor', notes: ['D', 'E', 'F', 'G', 'A', 'A#', 'C'] },
        { name: 'D# Natural Minor', notes: ['D#', 'F', 'F#', 'G#', 'A#', 'B', 'C#'] },
        { name: 'E Natural Minor', notes: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'] },
        { name: 'F Natural Minor', notes: ['F', 'G', 'G#', 'A#', 'C', 'C#', 'D#'] },
        { name: 'F# Natural Minor', notes: ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'] },
        { name: 'G Natural Minor', notes: ['G', 'A', 'A#', 'C', 'D', 'D#', 'F'] },
        { name: 'G# Natural Minor', notes: ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'F#'] },
        { name: 'A Natural Minor', notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] }, // Likely already exists
        { name: 'A# Natural Minor', notes: ['A#', 'C', 'C#', 'D#', 'F', 'F#', 'G#'] },
        { name: 'B Natural Minor', notes: ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'] },

        { name: 'C Dorian', notes: ['C', 'D', 'D#', 'F', 'G', 'A', 'A#'] }, // D#=Eb, A#=Bb
        { name: 'D Dorian', notes: ['D', 'E', 'F', 'G', 'A', 'B', 'C'] },
        { name: 'G Dorian', notes: ['G', 'A', 'A#', 'C', 'D', 'E', 'F'] },
        { name: 'A Dorian', notes: ['A', 'B', 'C', 'D', 'E', 'F#', 'G'] },

        { name: 'C Phrygian', notes: ['C', 'C#', 'D#', 'F', 'G', 'G#', 'A#'] }, // C#=Db, D#=Eb, G#=Ab, A#=Bb
        { name: 'E Phrygian', notes: ['E', 'F', 'G', 'A', 'B', 'C', 'D'] },
        { name: 'A Phrygian', notes: ['A', 'A#', 'C', 'D', 'E', 'F', 'G'] },

        { name: 'C Lydian', notes: ['C', 'D', 'E', 'F#', 'G', 'A', 'B'] },
        { name: 'F Lydian', notes: ['F', 'G', 'A', 'B', 'C', 'D', 'E'] },
        { name: 'G Lydian', notes: ['G', 'A', 'B', 'C#', 'D', 'E', 'F#'] },

        { name: 'C Mixolydian', notes: ['C', 'D', 'E', 'F', 'G', 'A', 'A#'] }, // A#=Bb
        { name: 'G Mixolydian', notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F'] },
        { name: 'D Mixolydian', notes: ['D', 'E', 'F#', 'G', 'A', 'B', 'C'] },
        { name: 'A Mixolydian', notes: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G'] },

        { name: 'C Aeolian (Nat Minor)', notes: ['C', 'D', 'D#', 'F', 'G', 'G#', 'A#'] }, // D#=Eb, G#=Ab, A#=Bb
        { name: 'A Aeolian (Nat Minor)', notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
        { name: 'E Aeolian (Nat Minor)', notes: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'] },
        { name: 'B Aeolian (Nat Minor)', notes: ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'] },

        { name: 'C Locrian', notes: ['C', 'C#', 'D#', 'F', 'F#', 'G#', 'A#'] }, // C#=Db, D#=Eb, F#=Gb, G#=Ab, A#=Bb
        { name: 'B Locrian', notes: ['B', 'C', 'D', 'E', 'F', 'G', 'A'] },

        // --- Harmonic Minor Scales ---
        { name: 'C Harmonic Minor', notes: ['C', 'D', 'D#', 'F', 'G', 'G#', 'B'] }, // Likely already exists
        { name: 'C# Harmonic Minor', notes: ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'C'] }, // C is B#
        { name: 'D Harmonic Minor', notes: ['D', 'E', 'F', 'G', 'A', 'A#', 'C#'] },
        { name: 'D# Harmonic Minor', notes: ['D#', 'F', 'F#', 'G#', 'A#', 'B', 'D'] }, // D is Cx
        { name: 'E Harmonic Minor', notes: ['E', 'F#', 'G', 'A', 'B', 'C', 'D#'] }, // Likely already exists
        { name: 'F Harmonic Minor', notes: ['F', 'G', 'G#', 'A#', 'C', 'C#', 'E'] },
        { name: 'F# Harmonic Minor', notes: ['F#', 'G#', 'A', 'B', 'C#', 'D', 'F'] }, // F is E#
        { name: 'G Harmonic Minor', notes: ['G', 'A', 'A#', 'C', 'D', 'D#', 'F#'] }, // Likely already exists
        { name: 'G# Harmonic Minor', notes: ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'G'] }, // G is Fx#
        { name: 'A Harmonic Minor', notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G#'] }, // Likely already exists
        { name: 'A# Harmonic Minor', notes: ['A#', 'C', 'C#', 'D#', 'F', 'F#', 'A'] }, // A is Gx#
        { name: 'B Harmonic Minor', notes: ['B', 'C#', 'D', 'E', 'F#', 'G', 'A#'] },

        // --- Melodic Minor Scales (Ascending - "Jazz Minor") ---
        { name: 'C Melodic Minor', notes: ['C', 'D', 'D#', 'F', 'G', 'A', 'B'] }, // Likely already exists
        { name: 'C# Melodic Minor', notes: ['C#', 'D#', 'E', 'F#', 'G#', 'A#', 'C'] }, // C is B#
        { name: 'D Melodic Minor', notes: ['D', 'E', 'F', 'G', 'A', 'B', 'C#'] }, // Likely already exists
        { name: 'D# Melodic Minor', notes: ['D#', 'F', 'F#', 'G#', 'A#', 'C', 'D'] }, // C is B#, D is Cx
        { name: 'E Melodic Minor', notes: ['E', 'F#', 'G', 'A', 'B', 'C#', 'D#'] },
        { name: 'F Melodic Minor', notes: ['F', 'G', 'G#', 'A#', 'C', 'D', 'E'] },
        { name: 'F# Melodic Minor', notes: ['F#', 'G#', 'A', 'B', 'C#', 'D#', 'F'] }, // F is E#
        { name: 'G Melodic Minor', notes: ['G', 'A', 'A#', 'C', 'D', 'E', 'F#'] }, // Likely already exists
        { name: 'G# Melodic Minor', notes: ['G#', 'A#', 'B', 'C#', 'D#', 'F', 'G'] }, // F is E#, G is Fx#
        { name: 'A Melodic Minor', notes: ['A', 'B', 'C', 'D', 'E', 'F#', 'G#'] }, // Likely already exists
        { name: 'A# Melodic Minor', notes: ['A#', 'C', 'C#', 'D#', 'F', 'G', 'A'] }, // G is Fx#
        { name: 'B Melodic Minor', notes: ['B', 'C#', 'D', 'E', 'F#', 'G#', 'A#'] },

        // --- Pentatonic Scales ---
        { name: 'C Major Pentatonic', notes: ['C', 'D', 'E', 'G', 'A'] },
        { name: 'G Major Pentatonic', notes: ['G', 'A', 'B', 'D', 'E'] },
        { name: 'F Major Pentatonic', notes: ['F', 'G', 'A', 'C', 'D'] },
        { name: 'A Minor Pentatonic', notes: ['A', 'C', 'D', 'E', 'G'] },
        { name: 'E Minor Pentatonic', notes: ['E', 'G', 'A', 'B', 'D'] },
        { name: 'C Minor Pentatonic', notes: ['C', 'D#', 'F', 'G', 'A#'] }, // D#=Eb, A#=Bb
        { name: 'C Egyptian (Suspended Pentatonic)', notes: ['C', 'D', 'F', 'G', 'A#'] }, // A#=Bb
        { name: 'F Egyptian (Suspended Pentatonic)', notes: ['F', 'G', 'A#', 'C', 'D'] }, // A#=Bb

        // --- Blues Scales ---
        { name: 'C Minor Blues', notes: ['C', 'D#', 'F', 'F#', 'G', 'A#'] }, // D#=Eb, F#=Gb(blue note), A#=Bb
        { name: 'A Minor Blues', notes: ['A', 'C', 'D', 'D#', 'E', 'G'] }, // D#=Eb(blue note)
        { name: 'E Minor Blues', notes: ['E', 'G', 'A', 'A#', 'B', 'D'] }, // A#=Bb(blue note)
        { name: 'C Major Blues', notes: ['C', 'D', 'D#', 'E', 'G', 'A'] }, // D#=Eb(blue note)
        { name: 'G Major Blues', notes: ['G', 'A', 'A#', 'B', 'D', 'E'] }, // A#=Bb(blue note)
        { name: 'A Major Blues', notes: ['A', 'B', 'C', 'C#', 'E', 'F#'] }, // C=Cb(blue note)

        // --- Symmetric Scales ---
        { name: 'Chromatic', notes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] },
        { name: 'C Whole Tone', notes: ['C', 'D', 'E', 'F#', 'G#', 'A#'] },
        { name: 'C# Whole Tone', notes: ['C#', 'D#', 'F', 'G', 'A', 'B'] }, // F=E#
        { name: 'C Diminished (WH)', notes: ['C', 'D', 'D#', 'F', 'F#', 'G#', 'A', 'B'] }, // D#=Eb, F#=Gb, G#=Ab
        { name: 'C Diminished (HW)', notes: ['C', 'C#', 'D#', 'E', 'F#', 'G', 'A', 'A#'] }, // C#=Db, D#=Eb, F#=Gb, A#=Bb

        // --- Bebop Scales ---
        { name: 'C Bebop Major', notes: ['C', 'D', 'E', 'F', 'G', 'G#', 'A', 'B'] }, // G#=Ab passing tone
        { name: 'C Bebop Dominant', notes: ['C', 'D', 'E', 'F', 'G', 'A', 'A#', 'B'] }, // A#=Bb (Mixolydian + Major 7th)
        { name: 'C Bebop Minor (Dorian)', notes: ['C', 'D', 'D#', 'E', 'F', 'G', 'A', 'A#'] }, // D#=Eb, A#=Bb (Dorian + Major 3rd)
        { name: 'A Bebop Minor', notes: ['A', 'B', 'C', 'C#', 'D', 'E', 'F#', 'G'] }, // (Aeolian + #4/b5) - Different flavors exist

        // --- Modes of Harmonic Minor ---
        { name: 'C Locrian #6', notes: ['C', 'C#', 'D#', 'F', 'F#', 'A', 'A#'] },
        { name: 'C Ionian #5', notes: ['C', 'D', 'E', 'F', 'G#', 'A', 'B'] },
        { name: 'C Dorian #4', notes: ['C', 'D', 'D#', 'F#', 'G', 'A', 'A#'] },
        { name: 'C Phrygian Dominant', notes: ['C', 'C#', 'E', 'F', 'G', 'G#', 'A#'] },
        { name: 'C Lydian #2', notes: ['C', 'D#', 'E', 'F#', 'G', 'A#', 'B'] },
        { name: 'C Super Locrian bb7', notes: ['C', 'C#', 'D#', 'E', 'F#', 'G#', 'A'] },

        // --- Modes of Melodic Minor ---
        { name: 'C Dorian b2', notes: ['C', 'C#', 'D#', 'F', 'G', 'A', 'A#'] },
        { name: 'C Lydian Augmented', notes: ['C', 'D', 'E', 'F#', 'G#', 'A', 'B'] },
        { name: 'C Lydian Dominant', notes: ['C', 'D', 'E', 'F#', 'G', 'A', 'A#'] },
        { name: 'C Mixolydian b6', notes: ['C', 'D', 'E', 'F', 'G', 'G#', 'A#'] },
        { name: 'C Locrian #2', notes: ['C', 'D', 'D#', 'F', 'F#', 'G#', 'A#'] },
        { name: 'C Altered Scale', notes: ['C', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'] },

        // --- "Exotic" / World / Other Scales ---
        { name: 'C Hungarian Minor', notes: ['C', 'D', 'D#', 'F#', 'G', 'G#', 'B'] },
        { name: 'C Hungarian Major', notes: ['C', 'D#', 'E', 'F#', 'G', 'A', 'A#'] },
        { name: 'C Neapolitan Minor', notes: ['C', 'C#', 'D#', 'F', 'G', 'G#', 'B'] },
        { name: 'C Neapolitan Major', notes: ['C', 'C#', 'D#', 'F', 'G', 'A', 'B'] },
        { name: 'C Persian', notes: ['C', 'C#', 'E', 'F', 'F#', 'G#', 'B'] },
        { name: 'C Enigmatic', notes: ['C', 'C#', 'E', 'F#', 'G#', 'A#', 'B'] },
        { name: 'C Spanish Gypsy', notes: ['C', 'C#', 'E', 'F', 'G', 'G#', 'A#'] },
        { name: 'C Spanish 8 Tone', notes: ['C', 'C#', 'D#', 'E', 'F', 'F#', 'G#', 'A#'] },
        { name: 'C Arabian', notes: ['C', 'D', 'E', 'F', 'F#', 'G#', 'A#'] },
        { name: 'C Balinese (Pelog)', notes: ['C', 'C#', 'D#', 'G', 'G#'] },
        { name: 'C Japanese (Insen)', notes: ['C', 'C#', 'F', 'G', 'A#'] },
        { name: 'C Japanese (Hirajoshi)', notes: ['C', 'D', 'D#', 'G', 'G#'] },
        { name: 'C Japanese (Iwato)', notes: ['C', 'C#', 'F', 'F#', 'A#'] },
        { name: 'C Prometheus', notes: ['C', 'D', 'E', 'F#', 'A', 'A#'] },
        { name: 'C Scriabin', notes: ['C', 'C#', 'E', 'F#', 'A', 'A#'] },
        { name: 'C Tritone', notes: ['C', 'C#', 'E', 'F#', 'G#', 'A#'] },
        { name: 'C Two-Semitone Tritone', notes: ['C', 'C#', 'D', 'F#', 'G', 'G#'] },
        { name: 'C Augmented', notes: ['C', 'D#', 'E', 'G', 'G#', 'B'] },
        { name: 'C Double Harmonic Major', notes: ['C', 'C#', 'E', 'F', 'G', 'G#', 'B'] },
    ];

    // --- State ---
    let selectedNotes = new Set();
    let currentSortOrder = 'asc';
    let enharmonicPreference = 'sharp'; // Default preference ('sharp' or 'flat')
    let currentRoot = null; // Root note of the last clicked scale (internal sharp notation)
    let currentTheme = 'light';
    let is3D = false;

    // --- Audio Context ---
    let audioContext = null;
    function getAudioContext() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser");
                alert("Web Audio API is not supported in this browser. Playback features will be disabled.");
                // Disable playback buttons if context fails
                playChordButton.disabled = true;
                playArpUpButton.disabled = true;
                playArpDownButton.disabled = true;
                playbackSpeedInput.disabled = true;
            }
        }
        // Resume context on interaction if needed
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        if (audioContext) window.Synth.init(audioContext); // no-op after the first call
        return audioContext;
    }

    // --- Functions ---

    // <<< Theme Functions Added >>>
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleButton.textContent = '🌙'; // Moon icon for dark
        } else {
            document.body.classList.remove('dark-mode');
            themeToggleButton.textContent = '☀️'; // Sun icon for light
        }
        currentTheme = theme;
        localStorage.setItem('theme', theme); // Save preference
        if (window.Piano3D) window.Piano3D.setTheme(theme);
    }

    function toggleTheme() {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    }
    // <<< End Theme Functions >>>

    function getNoteDisplayName(internalNote) {
        if (enharmonicPreference === 'flat' && sharpToFlat[internalNote]) {
            return sharpToFlat[internalNote];
        }
        return internalNote; // Return sharp name or natural name
    }

    // Generate Piano Keys
    function generateKeyboard() {
        pianoKeyboard.innerHTML = '';
        let whiteKeyIndex = 0;
        notesOrder.forEach(note => {
            const keyElement = document.createElement('div');
            keyElement.classList.add('key');
            keyElement.dataset.note = note; // Use internal sharp notation for data
            keyElement.textContent = note; // Display note name (will be sharp initially)

            if (note.includes('#')) {
                keyElement.classList.add('black');
                // Calculate left position based on the preceding white key index
                // Precise Positioning moved to CSS for clarity
            } else {
                keyElement.classList.add('white');
                whiteKeyIndex++;
            }

            keyElement.addEventListener('click', handleKeyClick);
            pianoKeyboard.appendChild(keyElement);
        });
    }

    function updateKeyLabels() {
        document.querySelectorAll('.key').forEach(key => {
            const internalNote = key.dataset.note;
            key.textContent = getNoteDisplayName(internalNote);
        });
    }

    // Handle Key Clicks
    function handleKeyClick(event) {
        toggleNote(event.target.dataset.note); // Use internal sharp notation
    }

    // Toggle a note's selection (shared by the 2D/3D keyboards and MIDI).
    // Plays the note as feedback unless the caller is already sounding it (MIDI).
    function toggleNote(note, { silent = false } = {}) {
        if (!silent) {
            const ctx = getAudioContext();
            if (ctx && noteFrequencies[note]) playNote(noteFrequencies[note], 0.8, ctx.currentTime);
        }
        const keyElement = pianoKeyboard.querySelector(`.key[data-note="${note}"]`);
        if (selectedNotes.has(note)) {
            selectedNotes.delete(note);
            if (keyElement) keyElement.classList.remove('selected');
        } else {
            selectedNotes.add(note);
            if (keyElement) keyElement.classList.add('selected');
        }
        updateRootAfterToggle();
        renderScaleList();
        updateSelectedNotesDisplay();
    }

    // Keep the root while it's still selected; otherwise the earliest-selected
    // remaining note becomes the root (Set keeps insertion order).
    function updateRootAfterToggle() {
        const keepRoot = currentRoot && selectedNotes.has(currentRoot);
        const root = keepRoot ? currentRoot : (selectedNotes.values().next().value || null);
        clearRootNoteHighlight();
        if (!root) return;
        currentRoot = root;
        const rootKeyElement = pianoKeyboard.querySelector(`.key[data-note="${root}"]`);
        if (rootKeyElement) rootKeyElement.classList.add('root-note');
    }

    // Handle Scale Clicks
    function handleScaleClick(event) {
        const scaleName = event.target.dataset.scaleName;
        const selectedScale = scales.find(s => s.name === scaleName);

        if (selectedScale) {
            clearAllSelections();

            // Select notes of the clicked scale
            selectedScale.notes.forEach(noteInData => {
                // Convert note from data to internal sharp representation for storage
                const internalNote = noteNameToInternal(noteInData);
                selectedNotes.add(internalNote);
                const keyElement = pianoKeyboard.querySelector(`.key[data-note="${internalNote}"]`);
                if (keyElement) {
                    keyElement.classList.add('selected');
                }
            });

            // Highlight Root Note
            clearRootNoteHighlight();
            // Convert root note from data to internal sharp representation for highlighting
            const internalRootNote = noteNameToInternal(selectedScale.notes[0]);
            currentRoot = internalRootNote;
            const rootKeyElement = pianoKeyboard.querySelector(`.key[data-note="${internalRootNote}"]`);
            if (rootKeyElement) {
                rootKeyElement.classList.add('root-note');
            }

            renderScaleList();
            updateSelectedNotesDisplay(); // Update the selected notes field
        }
    }

    // Clear All Selections & Highlights
    function clearAllSelections() {
        selectedNotes.clear();
        document.querySelectorAll('.key.selected').forEach(k => k.classList.remove('selected'));
        clearRootNoteHighlight(); // Also clear root note highlight
        updateSelectedNotesDisplay(); // Update display
        renderScaleList(); // Refresh scale list (show all)
    }

    // Clear only root note highlight
    function clearRootNoteHighlight() {
        currentRoot = null;
        document.querySelectorAll('.key.root-note').forEach(k => k.classList.remove('root-note'));
    }

    // Push the current selection/root/labels to the 3D view (if active)
    function syncViews() {
        if (!is3D || !window.Piano3D) return;
        const labels = {};
        notesOrder.forEach(n => { labels[n] = getNoteDisplayName(n); });
        window.Piano3D.update({ selected: Array.from(selectedNotes), root: currentRoot, labels });
    }

    // Briefly highlight a key while it sounds (2D and 3D)
    function pulseKey(note, delayMs, durationMs) {
        setTimeout(() => {
            const keyElement = pianoKeyboard.querySelector(`.key[data-note="${note}"]`);
            if (keyElement) {
                keyElement.classList.add('playing');
                setTimeout(() => keyElement.classList.remove('playing'), durationMs);
            }
            if (is3D && window.Piano3D) window.Piano3D.pulse(note);
        }, Math.max(0, delayMs));
    }

    // Switch between the flat 2D keyboard and the three.js 3D keyboard
    function apply3D(on) {
        is3D = on;
        localStorage.setItem('view3d', on ? '1' : '0');
        viewToggleButton.classList.toggle('active', on);
        viewToggleButton.textContent = on ? '2D' : '3D';
        viewToggleButton.title = on ? 'Switch to 2D keyboard' : 'Switch to 3D keyboard';

        if (!on) {
            if (window.Piano3D) window.Piano3D.disable();
            piano3dContainer.hidden = true;
            piano3dHint.hidden = true;
            pianoKeyboard.hidden = false;
            return;
        }

        if (!window.Piano3D) { apply3D(false); return; }
        pianoKeyboard.hidden = true;
        piano3dContainer.hidden = false;
        piano3dHint.hidden = false;
        piano3dContainer.classList.add('loading');
        window.Piano3D.setTheme(currentTheme);
        syncViews();
        window.Piano3D.enable(piano3dContainer, { toggleNote })
            .then(() => piano3dContainer.classList.remove('loading'))
            .catch(err => {
                console.error(err);
                piano3dContainer.classList.remove('loading');
                apply3D(false);
                piano3dHint.hidden = false;
                piano3dHint.textContent = 'Could not load three.js (offline?) — staying in 2D.';
                setTimeout(() => {
                    piano3dHint.hidden = !is3D;
                    piano3dHint.textContent = 'Drag to orbit · scroll to zoom · click keys to select';
                }, 4000);
            });
    }


    // Render Scale List
    function renderScaleList() {
        const filterText = scaleFilterInput.value.toLowerCase();

        let matchingScales;
        if (selectedNotes.size === 0) {
            matchingScales = [...scales];
            scaleListTitle.textContent = `All Scales (${scales.length})`;
        } else {
            const selectedNotesArray = Array.from(selectedNotes);
            matchingScales = scales.filter(scale => {
                // Ensure comparison uses internal sharp notation if data isn't consistent yet
                return selectedNotesArray.every(selectedNote => scale.notes.includes(selectedNote));
            });
            scaleListTitle.textContent = `Scales Containing Selected Notes (${matchingScales.length})`;
        }

        if (filterText) {
            matchingScales = matchingScales.filter(scale => scale.name.toLowerCase().includes(filterText));
        }

        matchingScales.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            return currentSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });

        scaleList.innerHTML = '';
        if (matchingScales.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No matching scales found.';
            li.classList.add('no-match');
            scaleList.appendChild(li);
        } else {
            matchingScales.forEach(scale => {
                const li = document.createElement('li');
                li.textContent = scale.name;
                li.dataset.scaleName = scale.name;
                li.addEventListener('click', handleScaleClick);
                scaleList.appendChild(li);
            });
        }
    }

    // Update the read-only field showing selected notes
    function updateSelectedNotesDisplay() {
        const sortedSelectedInternal = sortNotesChromatically(selectedNotes);
        // Convert internal notes to display names for the field
        const displayNotes = sortedSelectedInternal.map(note => getNoteDisplayName(note));
        selectedNotesField.value = displayNotes.join(', ');
        syncViews();
        // Persist selection (insertion order matters for the root rule) and root
        localStorage.setItem('selectedNotes', JSON.stringify(Array.from(selectedNotes)));
        localStorage.setItem('rootNote', currentRoot || '');
    }

    // Play a single note with the selected instrument (see synth.js)
    function playNote(frequency, durationSeconds, startTime, velocity = 90) {
        const ctx = getAudioContext();
        if (!ctx) return;
        window.Synth.play(frequency, durationSeconds, startTime, velocity);
    }

    // Sort notes chromatically (using internal sharp notation)
    function sortNotesChromatically(notes) {
        return [...notes].sort((a, b) => notesOrder.indexOf(a) - notesOrder.indexOf(b));
    }

    // Play Chord
    function playChord() {
        const ctx = getAudioContext();
        if (!ctx || selectedNotes.size === 0) return;

        const notesToPlay = Array.from(selectedNotes);
        const now = ctx.currentTime;
        const duration = 2.0;
        // Softer per-note velocity for big chords so they don't overload
        const velocity = Math.max(50, 100 - notesToPlay.length * 5);

        notesToPlay.forEach(note => {
            const freq = noteFrequencies[note];
            if (freq) {
                playNote(freq, duration, now, velocity);
                pulseKey(note, 0, 400);
            }
        });
    }

    // Play Arpeggio
    function playArpeggio(direction = 'up') {
        const ctx = getAudioContext();
        if (!ctx || selectedNotes.size === 0) return;

        const speedMs = parseInt(playbackSpeedInput.value, 10) || 200;
        const intervalSeconds = speedMs / 1000;
        // Let notes overlap and ring rather than being chopped off at the next note
        const noteDuration = intervalSeconds * 1.8 + 0.4;
        const now = ctx.currentTime;

        // Ascending sequence of { note, freq }. With "From root", start on the scale
        // root, shift wrapped notes up an octave and finish on the root an octave up.
        let sequence = sortNotesChromatically(selectedNotes).map(note => ({ note, freq: noteFrequencies[note] }));
        if (arpFromRootCheckbox.checked && currentRoot && selectedNotes.has(currentRoot)) {
            const rootIdx = sequence.findIndex(s => s.note === currentRoot);
            sequence = [
                ...sequence.slice(rootIdx),
                ...sequence.slice(0, rootIdx).map(s => ({ note: s.note, freq: s.freq * 2 })),
                { note: currentRoot, freq: noteFrequencies[currentRoot] * 2 },
            ];
        }
        if (direction === 'down') {
            sequence.reverse();
        }

        sequence.forEach(({ note, freq }, index) => {
            if (freq) {
                const startTime = now + index * intervalSeconds;
                const isLast = index === sequence.length - 1;
                playNote(freq, isLast ? Math.max(noteDuration, 1.5) : noteDuration, startTime);
                pulseKey(note, index * speedMs, Math.max(80, speedMs * 0.9));
            }
        });
    }

    // --- Event Listeners ---
    scaleFilterInput.addEventListener('input', renderScaleList);
    sortAscButton.addEventListener('click', () => {
        currentSortOrder = 'asc';
        renderScaleList();
    });
    sortDescButton.addEventListener('click', () => {
        currentSortOrder = 'desc';
        renderScaleList();
    });

    // Listener for the Clear Selection Button
    clearSelectionButton.addEventListener('click', clearAllSelections);

    enharmonicRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            enharmonicPreference = event.target.value;
            localStorage.setItem('enharmonic', enharmonicPreference);
            updateKeyLabels(); // Update text on piano keys
            updateSelectedNotesDisplay(); // Update text in the selected notes field
        });
    });

    themeToggleButton.addEventListener('click', toggleTheme);
    viewToggleButton.addEventListener('click', () => apply3D(!is3D));
    playChordButton.addEventListener('click', playChord);
    playArpUpButton.addEventListener('click', () => playArpeggio('up'));
    playArpDownButton.addEventListener('click', () => playArpeggio('down'));

    // Keyboard shortcuts: C = chord, U = arp up, D = arp down
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
        const target = event.target;
        // Don't hijack typing in the filter box or other form fields
        if (target.closest('input[type="text"], input[type="number"], textarea, select, [contenteditable]')) return;
        const actions = { c: playChord, u: () => playArpeggio('up'), d: () => playArpeggio('down') };
        const action = actions[event.key.toLowerCase()];
        if (action) {
            event.preventDefault();
            action();
        }
    });

    // --- Instrument & reverb ---
    const instrumentSelect = document.getElementById('instrument');
    const reverbCheckbox = document.getElementById('reverb');
    window.Synth.instruments.forEach(({ id, label }) => instrumentSelect.add(new Option(label, id)));
    instrumentSelect.value = localStorage.getItem('instrument') || 'piano';
    if (!instrumentSelect.value) instrumentSelect.value = 'piano';
    reverbCheckbox.checked = localStorage.getItem('reverb') !== '0';
    window.Synth.setInstrument(instrumentSelect.value);
    window.Synth.setReverb(reverbCheckbox.checked);

    instrumentSelect.addEventListener('change', () => {
        window.Synth.setInstrument(instrumentSelect.value);
        localStorage.setItem('instrument', instrumentSelect.value);
        // Audition the new sound with a quick C-major arpeggio
        const ctx = getAudioContext();
        if (ctx) ['C', 'E', 'G'].forEach((n, i) => playNote(noteFrequencies[n], 1.0, ctx.currentTime + i * 0.12));
    });
    reverbCheckbox.addEventListener('change', () => {
        window.Synth.setReverb(reverbCheckbox.checked);
        localStorage.setItem('reverb', reverbCheckbox.checked ? '1' : '0');
    });

    // --- MIDI Input (Web MIDI API) ---
    const midiConnectButton = document.getElementById('midi-connect');
    const midiSoundCheckbox = document.getElementById('midi-sound');
    const midiStatus = document.getElementById('midi-status');

    let midiAccess = null;
    const heldMidiNotes = new Set();   // MIDI note numbers physically held down
    const sustainedMidiNotes = new Set(); // released while the sustain pedal was down
    let sustainPedal = false;
    const voices = new Map();          // MIDI note number -> Synth voice

    const midiToFreq = (n) => 440 * Math.pow(2, (n - 69) / 12);
    const midiToNote = (n) => notesOrder[n % 12];

    // Sustained synth voice that lasts until note-off (unlike playNote's fixed length)
    function startVoice(midiNote, velocity) {
        const ctx = getAudioContext();
        if (!ctx) return;
        stopVoice(midiNote, true);
        const voice = window.Synth.noteOn(midiToFreq(midiNote), velocity);
        if (voice) voices.set(midiNote, voice);
    }

    function stopVoice(midiNote, immediate = false) {
        const v = voices.get(midiNote);
        if (!v) return;
        voices.delete(midiNote);
        v.stop(undefined, immediate);
    }

    function stopAllVoices() {
        [...voices.keys()].forEach(n => stopVoice(n));
        heldMidiNotes.clear();
        sustainedMidiNotes.clear();
        sustainPedal = false;
    }

    function handleMidiNoteOn(midiNote, velocity) {
        const note = midiToNote(midiNote);
        if (midiSoundCheckbox.checked) startVoice(midiNote, velocity);
        sustainedMidiNotes.delete(midiNote);
        pulseKey(note, 0, 200);

        heldMidiNotes.add(midiNote);
        // Exactly like a mouse click: toggle just this note. If MIDI sound is off,
        // fall back to the normal click feedback sound.
        toggleNote(note, { silent: midiSoundCheckbox.checked });
    }

    function handleMidiNoteOff(midiNote) {
        heldMidiNotes.delete(midiNote);
        if (sustainPedal) {
            sustainedMidiNotes.add(midiNote);
        } else {
            stopVoice(midiNote);
        }
    }

    function handleMidiMessage(event) {
        const [status, data1, data2] = event.data;
        const type = status & 0xf0;
        if (type === 0x90 && data2 > 0) {
            handleMidiNoteOn(data1, data2);
        } else if (type === 0x80 || (type === 0x90 && data2 === 0)) {
            handleMidiNoteOff(data1);
        } else if (type === 0xb0 && data1 === 64) { // Sustain pedal
            sustainPedal = data2 >= 64;
            if (!sustainPedal) {
                sustainedMidiNotes.forEach(n => stopVoice(n));
                sustainedMidiNotes.clear();
            }
        } else if (type === 0xb0 && (data1 === 120 || data1 === 123)) { // All sound/notes off
            stopAllVoices();
        }
    }

    function refreshMidiInputs() {
        if (!midiAccess) return;
        const inputs = [...midiAccess.inputs.values()];
        inputs.forEach(input => { input.onmidimessage = handleMidiMessage; });
        if (inputs.length === 0) {
            midiStatus.textContent = 'No MIDI devices found — plug one in';
            midiStatus.className = 'midi-status warn';
            stopAllVoices();
        } else {
            midiStatus.textContent = 'Listening: ' + inputs.map(i => i.name).join(', ');
            midiStatus.className = 'midi-status ok';
        }
    }

    function connectMidi() {
        if (!navigator.requestMIDIAccess) {
            midiStatus.textContent = 'Web MIDI is not supported in this browser (try Chrome or Edge)';
            midiStatus.className = 'midi-status warn';
            return;
        }
        getAudioContext(); // unlock audio with this click so MIDI notes can sound
        midiStatus.textContent = 'Requesting MIDI access…';
        midiStatus.className = 'midi-status';
        navigator.requestMIDIAccess().then(access => {
            midiAccess = access;
            midiAccess.onstatechange = refreshMidiInputs;
            midiConnectButton.textContent = 'Disconnect MIDI';
            midiConnectButton.title = 'Stop listening to MIDI devices';
            localStorage.setItem('midi', '1');
            refreshMidiInputs();
            // Restored on page load without a click: browsers keep audio muted until the first interaction
            if (audioContext && audioContext.state === 'suspended') {
                midiStatus.textContent += ' — click anywhere on the page to enable sound';
            }
        }).catch(err => {
            console.error(err);
            midiStatus.textContent = 'MIDI access was denied';
            midiStatus.className = 'midi-status warn';
            localStorage.setItem('midi', '0');
        });
    }

    function disconnectMidi() {
        if (midiAccess) {
            midiAccess.onstatechange = null;
            midiAccess.inputs.forEach(input => { input.onmidimessage = null; });
            midiAccess = null;
        }
        stopAllVoices();
        midiConnectButton.textContent = 'Connect MIDI';
        midiConnectButton.title = 'Listen to a connected MIDI keyboard';
        midiStatus.textContent = 'Not connected';
        midiStatus.className = 'midi-status';
        localStorage.setItem('midi', '0');
    }

    midiConnectButton.addEventListener('click', () => (midiAccess ? disconnectMidi() : connectMidi()));
    midiSoundCheckbox.addEventListener('change', () => {
        if (!midiSoundCheckbox.checked) stopAllVoices();
        localStorage.setItem('midiSound', midiSoundCheckbox.checked ? '1' : '0');
    });
    arpFromRootCheckbox.addEventListener('change', () => {
        localStorage.setItem('arpFromRoot', arpFromRootCheckbox.checked ? '1' : '0');
    });
    playbackSpeedInput.addEventListener('change', () => {
        localStorage.setItem('playbackSpeed', playbackSpeedInput.value);
    });

    // Resume AudioContext on first user interaction
    function initAudioContextOnInteraction() {
        getAudioContext(); // This call includes the resume logic now
        document.body.removeEventListener('click', initAudioContextOnInteraction);
        document.body.removeEventListener('keydown', initAudioContextOnInteraction);
    }
    document.body.addEventListener('click', initAudioContextOnInteraction, { once: true });
    document.body.addEventListener('keydown', initAudioContextOnInteraction, { once: true });

    // --- Initialisation (restore saved settings) ---
    const savedEnharmonic = localStorage.getItem('enharmonic');
    if (savedEnharmonic === 'sharp' || savedEnharmonic === 'flat') {
        document.querySelector(`input[name="enharmonic"][value="${savedEnharmonic}"]`).checked = true;
    }
    enharmonicPreference = document.querySelector('input[name="enharmonic"]:checked').value || 'sharp';

    const savedSpeed = parseInt(localStorage.getItem('playbackSpeed'), 10);
    if (savedSpeed >= 50 && savedSpeed <= 1000) playbackSpeedInput.value = savedSpeed;
    if (localStorage.getItem('arpFromRoot') !== null) arpFromRootCheckbox.checked = localStorage.getItem('arpFromRoot') === '1';
    if (localStorage.getItem('midiSound') !== null) midiSoundCheckbox.checked = localStorage.getItem('midiSound') === '1';

    const savedTheme = localStorage.getItem('theme') || 'light'; // Default to light
    applyTheme(savedTheme);

    generateKeyboard();
    updateKeyLabels(); // apply restored sharps/flats preference

    // Restore selected keys (in their original order) and root
    try {
        const savedNotes = JSON.parse(localStorage.getItem('selectedNotes') || '[]');
        savedNotes.filter(n => notesOrder.includes(n)).forEach(n => {
            selectedNotes.add(n);
            const keyElement = pianoKeyboard.querySelector(`.key[data-note="${n}"]`);
            if (keyElement) keyElement.classList.add('selected');
        });
    } catch (e) { /* ignore corrupt saved data */ }
    const savedRoot = localStorage.getItem('rootNote');
    if (savedRoot && selectedNotes.has(savedRoot)) {
        currentRoot = savedRoot;
        const rootKeyElement = pianoKeyboard.querySelector(`.key[data-note="${savedRoot}"]`);
        if (rootKeyElement) rootKeyElement.classList.add('root-note');
    }

    renderScaleList();
    updateSelectedNotesDisplay();
    if (localStorage.getItem('view3d') === '1') apply3D(true);
    if (localStorage.getItem('midi') === '1') connectMidi();
});