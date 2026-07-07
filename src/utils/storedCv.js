const STORED_CV_KEY = 'twif.savedCv';
const MAX_CV_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_CV_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ACCEPTED_CV_EXTENSIONS = ['.pdf', '.doc', '.docx'];

const getFileExtension = (fileName = '') => {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
};

export const formatFileSize = (sizeInBytes) => {
  if (!Number.isFinite(sizeInBytes) || sizeInBytes <= 0) {
    return '0 KB';
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const isAcceptedCvFile = (file) => {
  if (!file) {
    return false;
  }

  const extension = getFileExtension(file.name);
  return ACCEPTED_CV_TYPES.includes(file.type) || ACCEPTED_CV_EXTENSIONS.includes(extension);
};

export const validateCvFile = (file) => {
  if (!file) {
    return 'Select a CV file to continue.';
  }

  if (!isAcceptedCvFile(file)) {
    return 'Upload a PDF, DOC, or DOCX file.';
  }

  if (file.size > MAX_CV_SIZE_BYTES) {
    return 'CV must be 2 MB or smaller for now.';
  }

  return null;
};

export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read this file.'));
    reader.readAsDataURL(file);
  });

export const saveStoredCv = async (file) => {
  const error = validateCvFile(file);

  if (error) {
    throw new Error(error);
  }

  const dataUrl = await readFileAsDataUrl(file);
  const payload = {
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    lastModified: file.lastModified,
    savedAt: new Date().toISOString(),
    dataUrl,
  };

  localStorage.setItem(STORED_CV_KEY, JSON.stringify(payload));
  return payload;
};

export const getStoredCv = () => {
  const rawValue = localStorage.getItem(STORED_CV_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    localStorage.removeItem(STORED_CV_KEY);
    return null;
  }
};

export const removeStoredCv = () => {
  localStorage.removeItem(STORED_CV_KEY);
};

export const dataUrlToBlob = (dataUrl) => {
  const [meta, content] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || 'application/octet-stream';
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
};

export const getStoredCvFile = () => {
  const storedCv = getStoredCv();

  if (!storedCv?.dataUrl) {
    return null;
  }

  const blob = dataUrlToBlob(storedCv.dataUrl);
  return new File([blob], storedCv.name, {
    type: storedCv.type,
    lastModified: storedCv.lastModified,
  });
};
