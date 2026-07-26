"use client";

import { FormEvent, useRef, useState, DragEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Upload,
  X,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";
const ALLOWED_TYPES = [".pdf", ".docx", ".txt", ".csv"];

type UploadResult = {
  message: string;
  original_filename: string;
  size_bytes: number;
  character_count: number;
  extracted_text_path: string;
  text_preview: string;
  extraction_warning: string | null;
  recommended_strategy: {
    chunking_method: string;
    reason: string;
    ocr_required: boolean;
  };
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  function isValidFile(file: File) {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    return ALLOWED_TYPES.includes(ext as any);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files[0];

    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile);
      setResult(null);
      setError("");
    } else {
      setError("Unsupported file type. Allowed: PDF, DOCX, TXT, CSV.");
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      setResult(null);
      setError("");
    }
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault();

    if (!file) return;

    setIsUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));

        throw new Error((detail as any).detail || "Upload failed.");
      }

      const data: UploadResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  function resetUpload() {
    setFile(null);
    setResult(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold">Upload Document</h1>

      <p className="mt-2 text-sm text-zinc-400">
        Upload PDF, DOCX, TXT, or CSV files for compliance indexing.
      </p>

      <form onSubmit={handleUpload} className="mt-8">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition ${
            isDragging
              ? "border-teal-400 bg-teal-400/10"
              : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
          }`}
        >
          {file ? (
            <div className="flex items-center gap-3">
              <FileText className="text-teal-400" size={24} />

              <div>
                <p className="text-sm font-medium">{file.name}</p>

                <p className="text-xs text-zinc-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetUpload();
                }}
                className="ml-4 rounded p-1 hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <Upload className="text-zinc-500" size={32} />

              <p className="mt-4 text-sm text-zinc-400">
                Drop a file here or click to browse
              </p>

              <p className="mt-2 text-xs text-zinc-600">
                PDF, DOCX, TXT, or CSV
              </p>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {file && (
          <button
            type="submit"
            disabled={isUploading}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-teal-400 text-sm font-semibold text-zinc-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
          >
            {isUploading ? (
              <>
                <LoaderCircle className="animate-spin" size={18} />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload document
              </>
            )}
          </button>
        )}
      </form>

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-md border border-rose-800 bg-rose-950/50 p-4 text-sm text-rose-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4 rounded-md border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2 text-teal-300">
            <CheckCircle2 size={18} />

            <span className="text-sm font-medium">{result.message}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-zinc-500">File</p>

              <p className="mt-1">{result.original_filename}</p>
            </div>

            <div>
              <p className="text-xs text-zinc-500">Size</p>

              <p className="mt-1">
                {(result.size_bytes / 1024).toFixed(1)} KB
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500">Characters</p>

              <p className="mt-1">
                {result.character_count.toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500">Chunking strategy</p>

              <p className="mt-1 capitalize">
                {result.recommended_strategy.chunking_method.replace("_", " ")}
              </p>
            </div>
          </div>

          {result.extraction_warning && (
            <div className="flex items-start gap-2 rounded-md bg-amber-950/50 p-3 text-xs text-amber-300">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />

              <p>{result.extraction_warning}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-zinc-500">Text preview</p>

            <pre className="mt-2 max-h-40 overflow-y-auto rounded bg-zinc-950 p-3 text-xs leading-5 text-zinc-400">
              {result.text_preview}
            </pre>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetUpload}
              className="flex h-9 items-center gap-2 rounded-md border border-zinc-700 px-4 text-sm text-zinc-300 transition hover:bg-zinc-800"
            >
              Upload another
            </button>
          </div>
        </div>
      )}
    </main>
  );
}