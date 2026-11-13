// apps/web/src/components/ui/DeviceImageDropzone.tsx
'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, Image as ImageIcon, Trash2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export interface DeviceImageDropzoneProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  maxFileSizeMb?: number;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

export const DeviceImageDropzone: React.FC<DeviceImageDropzoneProps> = ({
  images,
  onChange,
  maxImages = 3,
  maxFileSizeMb = 5,
  label = 'Room Visual Assets',
  helperText = 'Drop photos from your local device or click to select. Supports PNG, JPG, WEBP (up to 3 images).',
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = Math.max(0, maxImages - images.length);
  const isFull = images.length >= maxImages;

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (fileList: FileList | File[]) => {
    setErrorMessage(null);
    if (disabled) return;

    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    if (isFull) {
      setErrorMessage(`Maximum limit of ${maxImages} images already reached. Remove an existing photo to upload another.`);
      return;
    }

    const validImageFiles: File[] = [];
    for (const file of filesArray) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage(`"${file.name}" is not an image file. Please provide PNG, JPG, or WEBP photos.`);
        continue;
      }
      if (file.size > maxFileSizeMb * 1024 * 1024) {
        setErrorMessage(`"${file.name}" exceeds the ${maxFileSizeMb}MB file size limit.`);
        continue;
      }
      validImageFiles.push(file);
    }

    if (validImageFiles.length === 0) return;

    const filesToUpload = validImageFiles.slice(0, remainingSlots);
    if (validImageFiles.length > remainingSlots) {
      setErrorMessage(`Only ${remainingSlots} slot(s) remaining. Uploaded first ${remainingSlots} photo(s).`);
    }

    try {
      setProcessing(true);
      const dataUrls = await Promise.all(filesToUpload.map(readFileAsDataUrl));
      onChange([...images, ...dataUrls]);
    } catch {
      setErrorMessage('An error occurred while reading selected files from device.');
    } finally {
      setProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isFull) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isFull && !isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer && e.dataTransfer.files) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (disabled) return;
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
    setErrorMessage(null);
  };

  const handleSlotClick = () => {
    if (!disabled && !isFull) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-4">
      {/* Label and Slot Counter Header */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-normal text-neutral-900 block">{label}</label>
          <p className="text-[11px] text-neutral-400 font-normal">{helperText}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isFull ? 'approved' : 'neutral'}
            className="font-mono text-[10px] px-2 py-0.5 font-normal"
          >
            {images.length} / {maxImages} Uploaded
          </Badge>
        </div>
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        multiple
        disabled={disabled || isFull}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleSlotClick}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer select-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-neutral-50 border-neutral-200'
            : isFull
            ? 'bg-neutral-50 border-neutral-200 cursor-default'
            : isDragging
            ? 'border-black bg-neutral-100 ring-2 ring-black/5'
            : 'border-neutral-200 hover:border-black bg-white hover:bg-neutral-50/50'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              isDragging
                ? 'bg-black text-white'
                : isFull
                ? 'bg-neutral-200 text-neutral-600'
                : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            {isFull ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : isDragging ? (
              <Upload className="w-5 h-5 animate-bounce" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-0.5">
            {isFull ? (
              <>
                <p className="text-xs font-normal text-neutral-800">
                  Maximum {maxImages} images uploaded
                </p>
                <p className="text-[11px] font-normal text-neutral-400">
                  To upload different photos or change order, remove an image from the slots below.
                </p>
              </>
            ) : isDragging ? (
              <>
                <p className="text-xs font-normal text-neutral-900">
                  Release to upload photos from device
                </p>
                <p className="text-[11px] font-mono text-neutral-500">
                  {remainingSlots} available slot(s)
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-normal text-neutral-800">
                  <span className="text-black underline underline-offset-2">Click to browse</span> or drag & drop photos here
                </p>
                <p className="text-[11px] font-normal text-neutral-400">
                  PNG, JPG, or WEBP up to {maxFileSizeMb}MB · Up to {maxImages} photos · {remainingSlots} slot(s) open
                </p>
              </>
            )}
          </div>
        </div>

        {processing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs rounded-2xl flex items-center justify-center text-xs font-normal text-neutral-700 font-mono">
            Reading image files from device...
          </div>
        )}
      </div>

      {/* Error notification banner */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-300 flex items-center justify-between text-xs text-neutral-800 font-normal">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-neutral-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:text-black transition-colors"
            title="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3-Slot Visual Gallery Showcase */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block">
          Photo Slots Showcase ({images.length} of {maxImages})
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: maxImages }).map((_, slotIndex) => {
            const currentImg = images[slotIndex];
            const isCover = slotIndex === 0;

            if (currentImg) {
              return (
                <div
                  key={`slot-filled-${slotIndex}`}
                  className="relative rounded-xl border border-neutral-200 overflow-hidden group bg-neutral-100 aspect-video flex items-center justify-center shadow-2xs"
                >
                  <img
                    src={currentImg}
                    alt={`Photo slot ${slotIndex + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as any).src = '/images/homepage/hotel-modern-facade.webp';
                    }}
                  />
                  {/* Subtle Top Badge */}
                  <div className="absolute top-2 left-2 pointer-events-none">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-black/75 text-white backdrop-blur-xs font-normal shadow-xs">
                      {isCover ? 'Slot 1 · Cover Photo' : `Slot ${slotIndex + 1}`}
                    </span>
                  </div>

                  {/* Hover Overlay with Delete Action */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(slotIndex);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-normal hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Delete this photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              );
            }

            // Empty Slot Placeholder
            return (
              <button
                type="button"
                key={`slot-empty-${slotIndex}`}
                onClick={handleSlotClick}
                disabled={disabled}
                className="relative rounded-xl border border-dashed border-neutral-300 hover:border-black bg-neutral-50/50 hover:bg-neutral-100/50 aspect-video flex flex-col items-center justify-center p-3 text-center transition-all group cursor-pointer disabled:cursor-not-allowed"
              >
                <div className="w-7 h-7 rounded-lg bg-white border border-neutral-200 group-hover:border-black flex items-center justify-center text-neutral-400 group-hover:text-black transition-colors mb-1">
                  <ImageIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-mono text-neutral-600 font-normal">
                  Slot #{slotIndex + 1}
                </span>
                <span className="text-[10px] text-neutral-400 font-normal">
                  {isCover ? 'Primary Cover Photo' : 'Gallery Asset'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

