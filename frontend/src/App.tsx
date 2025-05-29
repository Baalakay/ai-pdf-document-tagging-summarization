import React, { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { FaFileAlt } from "react-icons/fa";

const API_BASE = "http://localhost:8000";
const TAG_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-yellow-100 text-yellow-800 border-yellow-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-red-100 text-red-800 border-red-200"
];

type TagGroup = { name: string; tags: string[] };

type Document = {
  id: string;
  filename: string;
  summary: string;
  tags: string[];
};

function getTagColor(idx: number) {
  return TAG_COLORS[idx % TAG_COLORS.length];
}

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "analyzing">("idle");

  useEffect(() => {
    fetchDocuments();
    fetchTagGroups();
  }, []);

  async function fetchDocuments() {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/documents`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      setDocuments(await res.json() as Document[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function fetchTagGroups() {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/tags`);
      if (!res.ok) throw new Error("Failed to fetch tag library");
      setTagGroups(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function fetchDocumentDetails(id: string) {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`);
      if (!res.ok) throw new Error("Failed to fetch document details");
      setSelectedDoc(await res.json() as Document);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function uploadDocument(e: React.ChangeEvent<HTMLInputElement> | File) {
    let file: File | null = null;
    if (e instanceof File) {
      file = e;
    } else {
      file = e.target.files ? e.target.files[0] : null;
    }
    if (!file) return;
    setSelectedFileName(file.name);
    setUploading(true);
    setUploadStatus("uploading");
    setError("");
    // Show 'Uploading...' for at least 2 seconds
    const uploadDelay = new Promise(res => setTimeout(res, 2000));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadPromise = fetch(`${API_BASE}/process-document`, {
        method: "POST",
        body: formData,
      });
      // Wait for both the upload and the 2s delay
      await Promise.all([uploadPromise, uploadDelay]);
      setUploadStatus("analyzing");
      const res = await uploadPromise;
      if (!res.ok) throw new Error("Upload failed");
      await res.json();
      await fetchDocuments();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      setTimeout(() => setUploadStatus("idle"), 500); // Small delay for UX
    }
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    fetchDocumentDetails(id);
  }

  // Tag filtering
  const filteredDocs = filterTag
    ? documents.filter((doc) => doc.tags.includes(filterTag))
    : documents;

  return (
    <div className="light flex h-screen bg-white text-gray-900">
      {/* Left: Upload Section and Document List */}
      <aside className="w-96 flex flex-col p-5 bg-white border-r border-gray-200 shadow-2xl rounded-r-3xl min-w-[24rem] max-w-[24rem] overflow-y-auto">
        {/* Accordion for Upload Section */}
        <div className="w-full mb-8">
          <div
            className="w-full flex items-center justify-between font-extrabold text-blue-900 text-xl pb-3 border-b border-gray-200 cursor-pointer select-none"
            onClick={() => setUploadOpen((open) => !open)}
            aria-expanded={uploadOpen}
            aria-controls="upload-panel"
            tabIndex={0}
            role="button"
          >
            <span>Upload Document</span>
            <span className="ml-2 text-lg">{uploadOpen ? '▲' : '▼'}</span>
          </div>
          <div
            id="upload-panel"
            className={`overflow-hidden transition-all duration-300 ${uploadOpen ? 'max-h-96 opacity-100 py-4' : 'max-h-0 opacity-0 py-0'}`}
            aria-hidden={!uploadOpen}
          >
            <div className="flex flex-col gap-2 items-start px-2">
              <label htmlFor="file-upload" className="cursor-pointer inline-block px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded shadow-sm border border-blue-200 hover:bg-blue-100 transition">
                Choose File
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={e => uploadDocument(e)}
                  disabled={uploading}
                />
              </label>
              {selectedFileName && <span className="text-xs text-gray-500 ml-1">{selectedFileName}</span>}
              <Button
                disabled={uploading || !selectedFileName}
                className="mt-2 py-2 px-6 text-sm font-bold rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-400 text-white shadow-lg hover:from-blue-600 hover:to-pink-500 transition"
                onClick={() => {
                  // trigger upload if file is selected
                  const input = document.getElementById('file-upload') as HTMLInputElement;
                  if (input && input.files && input.files[0]) uploadDocument(input.files[0]);
                }}
              >
                {uploadStatus === "uploading"
                  ? "Uploading..."
                  : uploadStatus === "analyzing"
                  ? "Analyzing with AI..."
                  : "Upload"}
              </Button>
              {error && <div className="text-red-600 mt-2 text-sm font-medium">{error}</div>}
            </div>
          </div>
        </div>
        {/* Documents List */}
        <h2 className="text-xl font-extrabold mb-8 tracking-tight text-blue-900">Documents</h2>
        <ul className="flex-1 space-y-4 overflow-y-auto pr-2">
          {filteredDocs.length === 0 && (
            <li className="text-gray-400 text-center mt-10">No documents found.</li>
          )}
          {filteredDocs.map((doc: Document) => (
            <li
              key={doc.id}
              className={`flex items-center gap-4 p-2 bg-white shadow-none cursor-pointer transition ring-0 hover:bg-blue-50/80 ${selectedId === doc.id ? "bg-blue-200/60" : ""}`}
              onClick={() => handleSelect(doc.id)}
              style={{ transition: 'all 0.2s cubic-bezier(.4,2,.6,1)' }}
            >
              <FaFileAlt className="text-blue-400 text-xl shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-gray-900 truncate text-xs">{doc.filename}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {doc.tags && doc.tags.length > 0 && doc.tags.map((tag: string, i: number) => (
                    <span key={tag} className={`px-1.5 py-0.5 rounded-full border text-[10px] font-semibold shadow-sm ${getTagColor(i)}`}>{tag}</span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </aside>
      {/* Main Content */}
      <main className="flex-1 flex flex-col p-14 bg-white min-w-0">
        {/* Tag Library */}
        <section className="mb-8">
          <h2 className="text-xl font-extrabold mb-4 tracking-tight text-blue-900">Tag Library</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
            {/* Column 1: Governance, Communications */}
            <div className="flex flex-col">
              {tagGroups[0] && (
                <div className="py-2">
                  <span className="font-medium text-purple-600 text-xs mb-1">{tagGroups[0].name}</span>
                  <div className="flex flex-wrap gap-0.5">{tagGroups[0].tags.map((tag: string, idx: number) => (
                    <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition font-semibold border shadow-sm ${getTagColor(idx)}`} onClick={() => setFilterTag(filterTag === tag ? "" : tag)} tabIndex={0} role="button" aria-pressed={filterTag === tag} style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}>{tag}</span>
                  ))}</div>
                </div>
              )}
              {tagGroups[3] && (
                <div className="py-4">
                  <span className="font-medium text-purple-600 text-xs mb-1">{tagGroups[3].name}</span>
                  <div className="flex flex-wrap gap-0.5">{tagGroups[3].tags.map((tag: string, idx: number) => (
                    <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition font-semibold border shadow-sm ${getTagColor(idx)}`} onClick={() => setFilterTag(filterTag === tag ? "" : tag)} tabIndex={0} role="button" aria-pressed={filterTag === tag} style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}>{tag}</span>
                  ))}</div>
                </div>
              )}
            </div>
            {/* Column 2: Condo specific, Board members orientation & onboarding */}
            <div className="flex flex-col">
              {tagGroups[1] && (
                <div className="py-2">
                  <span className="font-medium text-purple-600 text-xs mb-1">{tagGroups[1].name}</span>
                  <div className="flex flex-wrap gap-0.5">{tagGroups[1].tags.map((tag: string, idx: number) => (
                    <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition font-semibold border shadow-sm ${getTagColor(idx)}`} onClick={() => setFilterTag(filterTag === tag ? "" : tag)} tabIndex={0} role="button" aria-pressed={filterTag === tag} style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}>{tag}</span>
                  ))}</div>
                </div>
              )}
              {tagGroups[4] && (
                <div className="py-4">
                  <span className="font-medium text-purple-600 text-xs mb-1">{tagGroups[4].name}</span>
                  <div className="flex flex-wrap gap-0.5">{tagGroups[4].tags.map((tag: string, idx: number) => (
                    <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition font-semibold border shadow-sm ${getTagColor(idx)}`} onClick={() => setFilterTag(filterTag === tag ? "" : tag)} tabIndex={0} role="button" aria-pressed={filterTag === tag} style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}>{tag}</span>
                  ))}</div>
                </div>
              )}
            </div>
            {/* Column 3: Finance, Insurance, Legal */}
            <div className="flex flex-col">
              {tagGroups[2] && (
                <div className="py-2">
                  <span className="font-medium text-purple-600 text-xs mb-1">{tagGroups[2].name}</span>
                  <div className="flex flex-wrap gap-0.5">{tagGroups[2].tags.map((tag: string, idx: number) => (
                    <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition font-semibold border shadow-sm ${getTagColor(idx)}`} onClick={() => setFilterTag(filterTag === tag ? "" : tag)} tabIndex={0} role="button" aria-pressed={filterTag === tag} style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}>{tag}</span>
                  ))}</div>
                </div>
              )}
              {tagGroups[5] && (
                <div className="py-4">
                  <span className="font-medium text-purple-600 text-xs mb-1">{tagGroups[5].name}</span>
                  <div className="flex flex-wrap gap-0.5">{tagGroups[5].tags.map((tag: string, idx: number) => (
                    <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition font-semibold border shadow-sm ${getTagColor(idx)}`} onClick={() => setFilterTag(filterTag === tag ? "" : tag)} tabIndex={0} role="button" aria-pressed={filterTag === tag} style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}>{tag}</span>
                  ))}</div>
                </div>
              )}
              {tagGroups[6] && (
                <div className="py-4">
                  <span className="font-medium text-purple-600 text-xs mb-1">{tagGroups[6].name}</span>
                  <div className="flex flex-wrap gap-0.5">{tagGroups[6].tags.map((tag: string, idx: number) => (
                    <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition font-semibold border shadow-sm ${getTagColor(idx)}`} onClick={() => setFilterTag(filterTag === tag ? "" : tag)} tabIndex={0} role="button" aria-pressed={filterTag === tag} style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}>{tag}</span>
                  ))}</div>
                </div>
              )}
            </div>
          </div>
        </section>
        {/* Restore Document Summary section below tag library */}
        {selectedId && selectedDoc && (
          <section className="flex-1 bg-white rounded-3xl shadow-2xl p-10 overflow-y-auto border border-gray-100">
            <h3 className="text-xl font-extrabold mb-6 text-blue-900 tracking-tight">Document Summary</h3>
            <div className="mb-4 text-gray-800 text-base leading-relaxed whitespace-pre-line font-medium">{selectedDoc.summary}</div>
            <div className="mt-6 flex flex-wrap gap-2 items-center">
              <span className="font-semibold text-gray-700">Tags:</span>
              {selectedDoc.tags && selectedDoc.tags.length > 0 ? (
                selectedDoc.tags.map((tag: string, i: number) => (
                  <span key={tag} className={`px-2 py-0.5 rounded-full border text-xs font-semibold shadow-sm ${getTagColor(i)}`}>{tag}</span>
                ))
              ) : (
                <span className="text-gray-400">None</span>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;