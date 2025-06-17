import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { UploadedFileState } from '../lib/types';

export function useFileUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileState[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }
      
      const allowedExtensions = ['.txt', '.md', '.markdown', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.json', '.html', '.yaml', '.yml', '.xml', '.tsx', '.ts', '.jsx', '.js', '.py', '.rb', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.php', '.sh', '.zsh', '.ps1', '.doc', '.docx', '.odt', '.rtf'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!allowedExtensions.includes(fileExtension)) {
        toast.error(`File "${file.name}" has an unsupported file type.`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      const fileReadPromises = validFiles.map(async (file): Promise<UploadedFileState> => {
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        const isTextFile = ![".jpg", ".jpeg", ".png", ".gif", ".pdf"].includes(fileExtension);

        if (isTextFile) {
          try {
            const text = await file.text();
            return { file, content: text };
          } catch (readError) {
            console.error(`Could not read file ${file.name}:`, readError);
            toast.error(`Could not read file ${file.name}`);
            return { file, content: null };
          }
        }
        return { file, content: null };
      });

      try {
        const newFilesWithContent = await Promise.all(fileReadPromises);
        setUploadedFiles(prev => [...prev, ...newFilesWithContent]);
        toast.success(`Successfully processed ${validFiles.length} file(s)`);
      } catch (error) {
        console.error('Error processing uploaded files:', error);
        toast.error('Error processing some files');
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddDocuments = () => {
    fileInputRef.current?.click();
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    toast.success('File removed');
  };

  const getFileContext = () => {
    return uploadedFiles
      .filter(f => f.content !== null)
      .map(f => `--- Start of File: ${f.file.name} ---\n${f.content}\n--- End of File: ${f.file.name} ---`)
      .join('\n\n');
  };

  const clearUploadedFiles = () => {
    setUploadedFiles([]);
  };

  return {
    uploadedFiles,
    fileInputRef,
    handleFileUpload,
    handleAddDocuments,
    removeUploadedFile,
    getFileContext,
    clearUploadedFiles,
  };
} 