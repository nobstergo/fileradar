const list = document.getElementById('results');
const searchInput = document.getElementById('search');
const folderButton = document.getElementById('select-folder');
const fileFilter = document.getElementById('file-filter');
const searchContentToggle = document.getElementById('search-content');
const clearButton = document.getElementById('clear-results');
const reloadButton = document.getElementById('reload-folder');
const spinner = document.getElementById('loading-spinner');
const historyList = document.getElementById('history-list');
const MAX_HISTORY = 5;
const selectPlaceholder = document.getElementById("select-folder-placeholder");
const entriesContainer = document.getElementById("entries-container");
const openFolderInsideBox = document.getElementById("open-folder-inside-box");
const mainSelectFolderBtn = document.getElementById("select-folder"); 

let files = [];
let folderPath = '';
let openMenu = null;
function enableOptions() {
  document.getElementById("file-filter").disabled = false;
  document.getElementById("search").disabled = false;
}
function updateFolderStats(totalFiles, totalSizeBytes) {
  const totalFilesEl = document.getElementById('total-files');
  const totalSizeEl = document.getElementById('total-size');

  totalFilesEl.textContent = totalFiles;

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;

    const mb = bytes / (k * k);

    if (mb > 1000) {
      const gb = bytes / (k * k * k);
      return gb.toFixed(2) + ' GB';
    }

    const sizes = ['B', 'KB', 'MB'];
    let i = 0;
    let value = bytes;

    while (value >= k && i < sizes.length - 1) {
      value /= k;
      i++;
    }
    return value.toFixed(2) + ' ' + sizes[i];
  }

  totalSizeEl.textContent = formatBytes(totalSizeBytes);
}

function showFolderPrompt() {
  selectPlaceholder.classList.remove("hidden");
  entriesContainer.classList.add("hidden");
}
let isDialogOpen = false;

async function openFolderDialog() {
  if (isDialogOpen) return; 

  isDialogOpen = true;

  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  isDialogOpen = false;

  if (!result.canceled && result.filePaths.length > 0) {
  }
}

function showEntries() {
  selectPlaceholder.classList.add("hidden");
  entriesContainer.classList.remove("hidden");
  
}

selectPlaceholder.addEventListener("click", () => {
  document.getElementById("select-folder").click();
});


function truncatePath(path, maxLength) {
  if (path.length <= maxLength) return path;
  const start = path.slice(0, 10);
  const end = path.slice(-15);
  return `${start}…${end}`;
}

function addToHistory(folderPath) {
  let history = JSON.parse(localStorage.getItem('folderHistory')) || [];
  history = history.filter(path => path !== folderPath);
  history.unshift(folderPath);
  if (history.length > MAX_HISTORY) {
    history = history.slice(0, MAX_HISTORY);
  }
  localStorage.setItem('folderHistory', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('folderHistory')) || [];
  historyList.innerHTML = '';

  if (history.length === 0) {
    const li = document.createElement('li');
    li.classList.add('text-gray-400', 'italic');
    li.textContent = 'Try opening a folder';
    historyList.appendChild(li);
    return;
  }

  history.forEach((path, index) => {
    const li = document.createElement('li');
li.classList.add(
  'flex', 'justify-between', 'items-center',
  'mb-2', 'bg-gray-800', 'text-gray-200',
  'hover:bg-gray-700', 'rounded', 'px-0', 'py-1', 'shadow-sm', 'transition'
);

    const truncated = truncatePath(path, 30);
    const btn = document.createElement('button');
    btn.textContent = truncated;
    btn.classList.add('text-left', 'text-xs', 'truncate', 'flex-grow');
    btn.title = path;
    btn.addEventListener('click', async () => {
      folderPath = path;
      files = await window.api.scanFolder(folderPath);
      renderFiles(files);
    });

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✖';
    removeBtn.classList.add('ml-2', 'text-xs', 'text-red-400', 'hover:text-red-600');
    removeBtn.title = 'Remove from history';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromHistory(index);
    });

    li.appendChild(btn);
    li.appendChild(removeBtn);
    historyList.appendChild(li);
  });
}

function removeFromHistory(index) {
  let history = JSON.parse(localStorage.getItem('folderHistory')) || [];
  history.splice(index, 1);
  localStorage.setItem('folderHistory', JSON.stringify(history));
  renderHistory();
}

function truncateMiddlePath(path, maxLength = 60) {
  if (path.length <= maxLength) return path;
  const start = path.slice(0, Math.floor(maxLength / 2) - 1);
  const end = path.slice(path.length - Math.floor(maxLength / 2) + 1);
  return `${start}…${end}`;
}


function toggleSpinner(show) {
  spinner.style.display = show ? 'block' : 'none';
}

function handleSearchAndFilter() {
  const query = searchInput.value.toLowerCase();
  const selectedExt = fileFilter.value;
  const searchContent = searchContentToggle.checked;

  const selectedExts = selectedExt.split(',');

  const filtered = files.filter(file => {
    const name = file.name.toLowerCase();
    const content = file.content?.toLowerCase() || "";

    const matchesName = name.includes(query);
    const matchesContent = searchContent && content.includes(query);

    const matchesExt =
      selectedExt === '*' ||
      selectedExts.some(ext => name.endsWith(ext));

    return (matchesName || matchesContent) && matchesExt;
  });

  renderFiles(filtered);
}

function truncateText(text, maxLength = 80) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

function renderFiles(fileArray) {
  enableOptions()
  const list = document.getElementById('fileList');
  list.innerHTML = '';

  const table = document.createElement('table');
  table.classList.add('w-full', 'text-sm', 'table-auto', 'border-separate', 'border-spacing-y-1');

  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr class="bg-gray-100 text-gray-600 font-bold">
      <th class="text-left p-2 pl-4 w-[250px]">Name</th>
      <th class="text-left p-2 w-[100px]">Extension</th>
      <th class="text-left p-2 w-[180px]">Date Modified</th>
      <th class="text-left p-2 w-[100px]">Size</th>
      <th class="text-left p-2 w-[40px]"></th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  if (fileArray.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `<td colspan="5" class="text-center text-gray-500 p-4">No matching files found.</td>`;
    tbody.appendChild(emptyRow);
  } else {
    fileArray.forEach(file => {
      const row = document.createElement('tr');
      row.classList.add('hover:bg-gray-100', 'transition', 'rounded-lg');
      row.title = file.path.length > 40 ? file.path : '';

      const nameCell = document.createElement('td');
      nameCell.classList.add('p-2', 'pl-2', 'w-[250px]', 'truncate', 'overflow-hidden', 'whitespace-nowrap', 'cursor-pointer');
      nameCell.title = file.path;

      nameCell.addEventListener('click', (e) => {
        e.stopPropagation();
        window.api.openFile(file.path)
          .then(() => console.log('Opened:', file.path))
          .catch(err => console.error('Error opening file:', err));
      });

      const nameWrapper = document.createElement('div');
      nameWrapper.classList.add('flex', 'items-center', 'gap-2', 'truncate');

      const fileIcon = document.createElement('i');
      fileIcon.classList.add('text-gray-400', 'fas');

      const fileName = document.createElement('span');
      fileName.textContent = truncateText(file.name, 40);
      fileName.title = file.name;
      fileName.classList.add('truncate', 'overflow-hidden', 'whitespace-nowrap', 'block');

      nameWrapper.appendChild(fileIcon);
      nameWrapper.appendChild(fileName);
      nameCell.appendChild(nameWrapper);
      row.appendChild(nameCell);

      const ext = file.name.split('.').pop().toLowerCase();
      const extCell = document.createElement('td');
      extCell.textContent = ext || '';
      extCell.classList.add('text-left', 'p-2', 'w-[100px]', 'truncate', 'text-gray-600', 'uppercase');

      let typeTitle = 'Unknown';
      if (['txt', 'md', 'log'].includes(ext)) typeTitle = 'Text';
      else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) typeTitle = 'Image';
      else if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) typeTitle = 'Document';
      else if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm'].includes(ext)) typeTitle = 'Video';
      else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) typeTitle = 'Archive';
      else if (['js', 'py', 'html', 'css', 'java', 'c', 'cpp'].includes(ext)) typeTitle = 'Code';

      extCell.title = typeTitle;
      row.appendChild(extCell);

      const modifiedCell = document.createElement('td');
      modifiedCell.classList.add('text-left', 'p-2', 'w-[180px]', 'truncate', 'whitespace-nowrap');
      let lastModifiedStr = 'Unknown';
      if (file.mtime) {
        const timestamp = typeof file.mtime === 'string' ? parseInt(file.mtime) : file.mtime;
        const dateObj = new Date(timestamp);
        if (!isNaN(dateObj.getTime())) {
          const hours = String(dateObj.getHours()).padStart(2, '0');
          const minutes = String(dateObj.getMinutes()).padStart(2, '0');
          lastModifiedStr = `${dateObj.toLocaleDateString()} ${hours}:${minutes}`;
        }
      }
      modifiedCell.textContent = lastModifiedStr;
      row.appendChild(modifiedCell);

      const sizeCell = document.createElement('td');
      sizeCell.classList.add('text-left', 'p-2', 'w-[100px]', 'truncate', 'font-bold', 'text-gray-600');
      let sizeText = '';
      if (file.size > 1024 * 1000) {
        sizeText = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      } else {
        sizeText = `${Math.round(file.size / 1024)} KB`;
      }
      sizeCell.textContent = sizeText;
      sizeCell.title = `${file.size} bytes`;
      row.appendChild(sizeCell);

      const menuCell = document.createElement('td');
      menuCell.classList.add('text-left', 'p-2', 'w-[40px]', 'flex', 'items-center', 'justify-center');

      const menuIcon = document.createElement('span');
      menuIcon.classList.add(
        'material-symbols-outlined',
        'text-gray-500',
        'hover:text-gray-700',
        'cursor-pointer',
        'flex',
        'items-center',
        'justify-center',
        'rounded-full',
        'hover:bg-gray-200',
        'transition-colors',
        'duration-150',
        'w-6',
        'h-6',
        'text-[18px]',
        'leading-none'
      );
      menuIcon.style.lineHeight = '1';
      menuIcon.title = 'More options';
      menuIcon.textContent = 'more_horiz';
      menuIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (openMenu) openMenu.remove();
        openMenu = createMenu(file, menuIcon);
      });

      menuCell.appendChild(menuIcon);
      row.appendChild(menuCell);

      tbody.appendChild(row);
    });
  }

  table.appendChild(tbody);
  list.appendChild(table);
const totalFiles = fileArray.length;
const totalSize = fileArray.reduce((sum, f) => sum + (f.size || 0), 0);
updateFolderStats(totalFiles, totalSize);

}


function createMenu(file, anchor) {
  const menu = document.createElement('div');
  menu.classList.add(
    'absolute', 'bg-white', 'shadow-md',
    'rounded', 'z-50', 'text-sm', 'border', 'w-48', 'py-1', 'font-sans', 'text-gray-700'
  );

  const openLoc = document.createElement('div');
  openLoc.textContent = 'Open File Location';
  openLoc.classList.add('px-4', 'py-2', 'hover:bg-gray-100', 'cursor-pointer');
  openLoc.addEventListener('click', (e) => {
    e.stopPropagation();
    window.api.openFileLocation(file.path);
    menu.remove();
    openMenu = null;
  });

  const details = document.createElement('div');
  details.textContent = 'File Details';
  details.classList.add('px-4', 'py-2', 'hover:bg-gray-100', 'cursor-pointer');
  details.addEventListener('click', (e) => {
    e.stopPropagation();
    showFileDetails(file);
    menu.remove();
    openMenu = null;
  });

  menu.appendChild(openLoc);
  menu.appendChild(details);

  const rect = anchor.getBoundingClientRect();
  const menuWidth = 192;
  const screenWidth = window.innerWidth;

  let left = rect.left;
  if (rect.left + menuWidth > screenWidth) {
    left = rect.right - menuWidth; 
    if (left < 0) left = 0;
  }

  menu.style.left = `${left}px`;
  menu.style.top = `${rect.bottom + window.scrollY}px`;

  document.body.appendChild(menu);

  const handleOutsideClick = (event) => {
    if (!menu.contains(event.target) && !anchor.contains(event.target)) {
      menu.remove();
      openMenu = null;
      document.removeEventListener('click', handleOutsideClick);
    }
  };

  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick);
  }, 0);

  return menu;
}

function showFileDetails(file) {
  const content = `
    <div><strong>Name:</strong> ${file.name}</div>
    <div><strong>Size:</strong> ${Math.round(file.size / 1024)} KB</div>
    <div><strong>Path:</strong> ${file.path}</div>
    <div><strong>Last Modified:</strong> ${new Date(file.lastModified).toLocaleString()}</div>
  `;
  const overlay = document.createElement('div');
  overlay.classList.add('fixed', 'inset-0', 'bg-black/50', 'z-50', 'flex', 'items-center', 'justify-center');

  const dialog = document.createElement('div');
  dialog.classList.add('bg-white', 'rounded', 'p-4', 'max-w-md', 'w-full', 'text-black', 'space-y-2', 'border', 'border-gray-300');

  dialog.innerHTML = `
    <h2 class="text-lg font-bold mb-2">File Details</h2>
    ${content}
    <div class="flex justify-end pt-2">
      <button class="mt-2 px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Close</button>
    </div>
  `;

  dialog.querySelector('button').addEventListener('click', () => overlay.remove());
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}

renderHistory();
searchInput.addEventListener('input', handleSearchAndFilter);
fileFilter.addEventListener('change', handleSearchAndFilter);
searchContentToggle.addEventListener('change', () => {
  searchInput.value = '';
  handleSearchAndFilter();
});

folderButton.addEventListener('click', async () => {
  folderPath = await window.api.selectFolder();  
  if (!folderPath) return;
  toggleSpinner(true);
  setTimeout(async () => {
    files = await window.api.scanFolder(folderPath);
    addToHistory(folderPath);
    toggleSpinner(false);
    searchInput.value = '';
    fileFilter.value = '*';
    searchContentToggle.checked = false;
    renderFiles(files);
  }, 10);
});

reloadButton.addEventListener('click', async () => {
  if (!folderPath) {
    alert('Please select a folder first.');
    return;
  }
  toggleSpinner(true);
  setTimeout(async () => {
    files = await window.api.scanFolder(folderPath);
    toggleSpinner(false);
    renderFiles(files);
  }, 10);
});

window.addEventListener("DOMContentLoaded", () => {
  showFolderPrompt();
});
