// --- Core Variables ---
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const workspace = document.getElementById('workspace');
const paper = document.getElementById('paper');
const cursorCircle = document.getElementById('cursor-circle');

let isDrawing = false;
let activeTool = 'pencil'; // pencil, eraser
let settings = {
    color: '#000000',
    penWidth: 3,
    eraserWidth: 20
};

// Pages System
let pages = [];
let currentPageIndex = 0;

// History System
let history = [];
let historyStep = -1;
const MAX_HISTORY = 20;

// --- Initialization ---
function init() {
    // Initial Page
    loadPagesData(); // Simulate loading from storage (empty for now)

    setPaperSize('screen');
    window.addEventListener('resize', handleWindowResize);

    // Pointer Events for Drawing
    canvas.addEventListener('pointerdown', startDraw);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', endDraw);
    canvas.addEventListener('pointercancel', endDraw);

    // Cursor Tracking
    document.addEventListener('pointermove', moveCursor);
    document.addEventListener('pointerleave', hideCursor);

    updateCursorSize();
    updatePageIndicator();
    updateSliderUI();

    // Save initial state if empty
    if (pages.length === 0) {
        savePageToMemory();
    }
}

function handleWindowResize() {
    if (paper.dataset.size === 'screen') {
        // Optional: Resize logic
    }
}

function setPaperSize(size) {
    if (size === 'screen') {
        resizePaper('screen');
    }
}

// --- Cursor Logic ---
function moveCursor(e) {
    if (e.pointerType === 'touch') {
        // Hide custom cursor on touch devices to let user see where they touch
        cursorCircle.style.display = 'none';
        return;
    }

    cursorCircle.style.display = 'block';
    cursorCircle.style.left = e.clientX + 'px';
    cursorCircle.style.top = e.clientY + 'px';
}

function hideCursor() {
    cursorCircle.style.display = 'none';
}

function updateCursorSize() {
    let size = (activeTool === 'eraser') ? settings.eraserWidth : settings.penWidth;
    // Scale visual cursor slightly for better visibility
    cursorCircle.style.width = size + 'px';
    cursorCircle.style.height = size + 'px';

    // Update color
    if (activeTool === 'eraser') {
        cursorCircle.style.borderColor = '#000';
        cursorCircle.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
    } else {
        cursorCircle.style.borderColor = settings.color;
        cursorCircle.style.backgroundColor = 'transparent';
    }
}

// --- Page Management ---
function loadPagesData() {
    // Ideally load from LocalStorage here
    pages = [];
    currentPageIndex = 0;
}

function savePageToMemory() {
    pages[currentPageIndex] = canvas.toDataURL();
}

function newPage() {
    savePageToMemory();

    // Create new blank page
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Be sure to handle background patterns if they were drawn on canvas
    // Here we just clear, CSS handles background visuals

    // Add to array
    pages.push(canvas.toDataURL());
    currentPageIndex = pages.length - 1;

    // Reset History for new page
    history = [];
    historyStep = -1;
    saveState(); // Save blank state

    updatePageIndicator();
}

function prevPage() {
    if (currentPageIndex > 0) {
        savePageToMemory();
        currentPageIndex--;
        loadPage(currentPageIndex);
    }
}

function nextPage() {
    if (currentPageIndex < pages.length - 1) {
        savePageToMemory();
        currentPageIndex++;
        loadPage(currentPageIndex);
    }
}

function loadPage(index) {
    const data = pages[index];
    const img = new Image();
    img.onload = function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        // Reset history for loaded page (simple version: clear history)
        // Advanced: Store history per page
        history = [];
        historyStep = -1;
        saveState();
    };
    img.src = data;
    updatePageIndicator();
}

function updatePageIndicator() {
    document.getElementById('pageIndicator').innerText =
        `${currentPageIndex + 1}/${Math.max(1, pages.length)}`;
}


// --- Drawing Logic ---
function startDraw(e) {
    // Only draw if target is canvas
    if (e.target !== canvas) return;

    isDrawing = true;
    ctx.beginPath();

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.moveTo(x, y);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = settings.eraserWidth;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = settings.color;
        ctx.lineWidth = settings.penWidth;
        ctx.lineTo(x, y);
        ctx.stroke();
    }
}

function draw(e) {
    if (!isDrawing) return;
    if (e.target !== canvas) return;

    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
}

function endDraw() {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.beginPath();
    saveState();
}

// --- History / Undo / Redo ---
function saveState() {
    if (historyStep < history.length - 1) {
        history = history.slice(0, historyStep + 1);
    }

    history.push(canvas.toDataURL());
    if (history.length > MAX_HISTORY) {
        history.shift();
    } else {
        historyStep++;
    }
    updateUndoRedoButtons();
}

function undo() {
    if (historyStep > 0) {
        historyStep--;
        restoreState(history[historyStep]);
    }
    updateUndoRedoButtons();
}

function redo() {
    if (historyStep < history.length - 1) {
        historyStep++;
        restoreState(history[historyStep]);
    }
    updateUndoRedoButtons();
}

function restoreState(dataUrl) {
    const img = new Image();
    img.onload = function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
}

function updateUndoRedoButtons() {
    document.getElementById('btnUndo').disabled = (historyStep <= 0);
    document.getElementById('btnRedo').disabled = (historyStep >= history.length - 1);
}

// --- Tools & Settings ---
function setTool(tool) {
    activeTool = tool;
    document.getElementById('toolPencil').classList.toggle('active', tool === 'pencil');
    document.getElementById('toolEraser').classList.toggle('active', tool === 'eraser');

    updateSliderUI();
    updateCursorSize();
}

function updateSliderUI() {
    const slider = document.getElementById('strokeSlider');
    const label = document.getElementById('sizeLabel');
    if (activeTool === 'eraser') {
        slider.value = settings.eraserWidth;
        label.innerText = 'Eraser Size: ' + settings.eraserWidth;
    } else {
        slider.value = settings.penWidth;
        label.innerText = 'Pen Size: ' + settings.penWidth;
    }
}

function updateSettings() {
    const val = document.getElementById('strokeSlider').value;
    document.getElementById('sizeLabel').innerText = (activeTool === 'eraser' ? 'Eraser' : 'Pen') + ' Size: ' + val;

    if (activeTool === 'eraser') {
        settings.eraserWidth = val;
    } else {
        settings.penWidth = val;
    }
    updateCursorSize();
}

function togglePopup(id) {
    const el = document.getElementById(id);
    const isShowing = el.classList.contains('show');
    document.querySelectorAll('.popup-menu').forEach(p => p.classList.remove('show'));
    if (!isShowing) el.classList.add('show');
}

function setColor(color, el) {
    settings.color = color;
    document.querySelectorAll('.color-opt').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    updateCursorSize();
}

function toggleModal(id) {
    const el = document.getElementById(id);
    el.style.display = (el.style.display === 'flex') ? 'none' : 'flex';
}

// --- Paper Management ---
function resizePaper(size) {
    toggleModal('menuModal');
    let w, h;

    // Save current content first
    const currentContent = canvas.toDataURL();

    if (size === 'screen') {
        w = workspace.clientWidth - 40;
        h = workspace.clientHeight - 40;
        paper.dataset.size = 'screen';
    } else if (size === 'a4') {
        w = 794;
        h = 1123;
        paper.dataset.size = 'fixed';
    } else if (size === 'infinite') {
        w = workspace.clientWidth - 40;
        h = 4000;
        paper.dataset.size = 'fixed';
    }

    paper.style.width = w + 'px';
    paper.style.height = h + 'px';
    canvas.width = w;
    canvas.height = h;

    // Restore
    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0);
        saveState();
        savePageToMemory(); // Update current page in array with new size
    };
    img.src = currentContent;
}

function setPattern(cls) {
    paper.className = 'paper-container ' + cls;
    toggleModal('menuModal');
}

// --- Export ---
function saveToGallery() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tCtx = tempCanvas.getContext('2d');

    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = 'notebook-page-' + (currentPageIndex + 1) + '.png';
    link.href = tempCanvas.toDataURL();
    link.click();
}

// Start
window.addEventListener('load', init);
