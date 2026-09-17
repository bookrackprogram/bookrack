const BOOKRACK_STORAGE_KEY = 'bookrack_data_v1';
const BOOKRACK_LEGACY_PREFIXES = [
  'bookshelf_courses_v12',
  'bookshelf_courses_v13',
  'bookshelf_courses_v14',
  'bookshelf_courses_v15',
  'bookshelf_courses_v15_1',
  'bookshelf_courses_v16',
  'bookshelf_courses_v17',
  'bookshelf_courses_v18',
  'bookshelf_courses_v19',
  'bookrack_v20_1_courses',
  'bookrack_v20_2_courses',
  'bookrack_v21_courses',
  'bookrack_v22_courses',
  'bookrack_v23_courses',
  'bookrack_v24_courses',
  'bookrack_v25_courses',
  'bookrack_v26_courses'
];

function emptyBookrackData() {
  return {
    version: 1,
    savedAt: null,
    profile: null,
    courses: [],
    sessions: [],
    assignments: [],
    grades: [],
    tasks: [],
    study: []
  };
}

function normalizeBookrackData(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  return {
    version: Number(data.version) || 1,
    savedAt: data.savedAt || null,
    profile: data.profile || null,
    courses: Array.isArray(data.courses) ? data.courses : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    assignments: Array.isArray(data.assignments) ? data.assignments : [],
    grades: Array.isArray(data.grades) ? data.grades : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    study: Array.isArray(data.study) ? data.study : []
  };
}

function loadBookrackData() {
  try {
    const saved = localStorage.getItem(BOOKRACK_STORAGE_KEY);
    if (!saved) return emptyBookrackData();
    return normalizeBookrackData(JSON.parse(saved));
  } catch (error) {
    console.error('Bookrack could not load saved data:', error);
    return emptyBookrackData();
  }
}

function saveBookrackData(state) {
  const data = normalizeBookrackData({
    ...state,
    version: 1,
    savedAt: new Date().toISOString()
  });

  try {
    localStorage.setItem(BOOKRACK_STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem('bookrack_last_saved', data.savedAt);
    return { ok: true, savedAt: data.savedAt };
  } catch (error) {
    console.error('Bookrack could not save data:', error);
    return { ok: false, error };
  }
}

function downloadBookrackBackup(state) {
  const data = normalizeBookrackData({
    ...state,
    version: 1,
    savedAt: new Date().toISOString(),
    exportedAt: new Date().toISOString(),
    dayFormat: 'sunday-first'
  });

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bookrack-backup-${data.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function restoreBookrackBackup(file, onSuccess, onError) {
  if (!file) {
    onError?.(new Error('Choose a JSON backup file first.'));
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = normalizeBookrackData(JSON.parse(reader.result));
      const saveResult = saveBookrackData(imported);
      if (!saveResult.ok) throw saveResult.error;
      onSuccess?.({ ...imported, savedAt: saveResult.savedAt });
    } catch (error) {
      onError?.(error);
    }
  };
  reader.onerror = () => onError?.(new Error('The backup file could not be read.'));
  reader.readAsText(file);
}

function installBookrackAutoSave(getState, onSaveError) {
  const persist = () => {
    const result = saveBookrackData(getState());
    if (!result.ok) onSaveError?.(result.error);
  };

  window.addEventListener('beforeunload', persist);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persist();
  });

  return persist;
}
