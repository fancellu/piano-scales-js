# Piano Scale Finder

A simple, interactive single-page web application designed to help users explore musical scales on a piano keyboard.

## Features

*   **Interactive Piano Keyboard:** Displays a standard C-to-B piano octave (including sharps/flats).
*   **Note Selection:** Click on piano keys to toggle their selection.
*   **Scale Identification:** Automatically displays a list of all musical scales that contain the currently selected notes.
    *   Shows all scales if no notes are selected.
*   **Scale Filtering:** Filter the list of scales by name using the search input.
*   **Scale Sorting:** Sort the displayed scale list alphabetically (A-Z or Z-A).
*   **Scale Selection:** Click on a scale name in the list to instantly select only the notes belonging to that scale on the keyboard.
*   **Selected Notes Display:** Shows the currently selected notes (sorted chromatically) in a text field for easy reference or copying.
*   **Enharmonic Toggle:** Switch the display of accidentals (black keys and selected notes) between sharps (#) and flats (b).
*   **Audio Playback (Web Audio API):**
    *   Play the selected notes simultaneously as a **Chord**.
    *   Play the selected notes sequentially as an **Arpeggio** (ascending or descending).
    *   Adjust the playback speed for arpeggios.
*   **Light/Dark Mode:** Toggle between light and dark themes for visual preference. The setting is saved in your browser's `localStorage`.
*   **Root Note Highlight:** When a scale is selected from the list, its root note is visually indicated on the keyboard.

## How to Use

1.  **Download:** Ensure you have the following three files in the same directory:
    *   `index.html`
    *   `style.css`
    *   `script.js`
2.  **Open:** Open the `index.html` file in a modern web browser (e.g., Chrome, Firefox, Safari, Edge) that supports the Web Audio API for playback features.
3.  **Interact:**
    *   Click piano keys to select/deselect notes.
    *   Observe the "Available Scales" list update automatically.
    *   Use the filter field or sort buttons to manage the scale list.
    *   Click a scale name in the list to select its notes.
    *   Use the enharmonic toggle (#/b) to change accidental display.
    *   Use the playback buttons to hear the selected notes.
    *   Use the theme toggle button (☀️/🌙) in the top-right corner to switch between light and dark modes.

## Preview

[Click here to Preview](http://htmlpreview.github.io/?https://github.com/fancellu/piano-scales-js/blob/main/index.html)

## File Structure

*   **`index.html`**: Contains the HTML structure of the application, including the layout for the keyboard, controls, and lists. Links to the CSS and JavaScript files.
*   **`style.css`**: Contains all the CSS rules for styling the application, including keyboard appearance, layout, colors (with light/dark mode variables), and responsiveness.
*   **`script.js`**: Contains all the JavaScript logic, including:
    *   Keyboard generation and event handling.
    *   Scale data (names and notes).
    *   Scale filtering and display logic.
    *   Audio playback using the Web Audio API.
    *   Enharmonic preference handling.
    *   Theme switching and `localStorage` persistence.

## Technologies Used

*   HTML5
*   CSS3 (including CSS Variables for theming)
*   JavaScript (ES6+)
*   Web Audio API

## Potential Future Enhancements

*   **Complete Interval Data:** The `script.js` file is structured to potentially display the interval pattern (e.g., W-W-H...) for each scale, but the interval data needs to be manually added to the `scales` array for most entries.
*   **Multi-Octave Display/Playback:** Extend the keyboard and playback to cover more than one octave.
*   **More Accurate Enharmonics:** Update the `scales` data itself to use the theoretically correct sharps or flats for each scale key signature, rather than just relying on the display toggle.
*   **Chord Identification:** Add logic to identify common chord names based on selected notes.
*   **Improved Audio:** Use more sophisticated synthesis or real piano samples for playback.
*   **Mobile Responsiveness:** Further improve layout adjustments for smaller screens.

---

Enjoy exploring scales!