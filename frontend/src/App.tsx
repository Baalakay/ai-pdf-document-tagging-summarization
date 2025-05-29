import React, { useEffect, useState, useRef } from "react";
import { FaFileAlt, FaTrash } from "react-icons/fa";

const API_BASE = "http://localhost:8000";

type TagGroup = { name: string; tags: string[] };

type Document = {
  id: string;
  filename: string;
  summary: string;
  tags: string[];
};

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "processing">("idle");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const STONE_TAGS = ["Owner Issues", "Governance"];
  const STONE_COLOR = "bg-stone-100 text-stone-800 border-stone-200";

  useEffect(() => {
    fetchDocuments();
    fetchTagGroups();
  }, []);

  async function fetchDocuments() {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/documents`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      const docs = await res.json() as Document[];
      setDocuments(docs.map((doc: Document) => ({ ...doc, id: String(doc.id) })));
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

  async function uploadDocument(files: File[]) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadStatus("processing");
    setError("");
    let lastUploadedFilename: string | null = null;
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch(`${API_BASE}/process-document`, {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        await uploadRes.json();
        lastUploadedFilename = file.name;
      }
      // Fetch documents and auto-select the newly uploaded one
      const res = await fetch(`${API_BASE}/documents`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      const docs = await res.json();
      setDocuments(docs.map((doc: Document) => ({ ...doc, id: String(doc.id) })));
      setFilterTags([]); // Clear filters so new doc is visible
      if (lastUploadedFilename) {
        const newDoc = docs.find((doc: Document) => doc.filename === lastUploadedFilename);
        if (newDoc) {
          setSelectedId(String(newDoc.id));
          fetchDocumentDetails(String(newDoc.id));
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      setTimeout(() => setUploadStatus("idle"), 500); // Small delay for UX
      setSelectedFiles([]);
    }
  }

  function handleSelect(id: string | number) {
    const stringId = String(id);
    setSelectedId(stringId);
    fetchDocumentDetails(stringId);
  }

  // Update filteredDocs to match all selected tags
  const filteredDocs = filterTags.length > 0
    ? documents.filter((doc) => filterTags.every(tag => doc.tags.includes(tag)))
    : documents;

  // Build a set of all original tags from tagGroups
  const originalTagSet = React.useMemo(() => {
    const set = new Set<string>();
    tagGroups.forEach(group => group.tags.forEach(tag => set.add(tag)));
    return set;
  }, [tagGroups]);

  // Expanded color palette for more visual pop
  const MAIN_TAG_COLORS = [
    "bg-blue-100 text-blue-800 border-blue-200",
    "bg-green-100 text-green-800 border-green-200",
    "bg-purple-100 text-purple-800 border-purple-200",
    "bg-pink-100 text-pink-800 border-pink-200",
    "bg-yellow-100 text-yellow-800 border-yellow-200",
    "bg-orange-100 text-orange-800 border-orange-200",
    "bg-cyan-100 text-cyan-800 border-cyan-200",
    "bg-indigo-100 text-indigo-800 border-indigo-200",
    "bg-teal-100 text-teal-800 border-teal-200",
    "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
    "bg-lime-100 text-lime-800 border-lime-200",
    "bg-rose-100 text-rose-800 border-rose-200",
    "bg-sky-100 text-sky-800 border-sky-200",
    "bg-violet-100 text-violet-800 border-violet-200",
    "bg-pink-100 text-pink-800 border-pink-200",
    "bg-mint-100 text-mint-800 border-mint-200"
  ];

  // Build tag->color map based on tag library order, then assign colors to custom tags
  const tagColorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    let colorIdx = 0;
    // Assign colors to library tags
    tagGroups.forEach(group => {
      group.tags.forEach(tag => {
        if (STONE_TAGS.includes(tag)) {
          map.set(tag, STONE_COLOR);
        } else {
          map.set(tag, MAIN_TAG_COLORS[colorIdx % MAIN_TAG_COLORS.length]);
          colorIdx++;
        }
      });
    });
    // Assign colors to custom tags
    const allDocTags = documents.flatMap(doc => doc.tags);
    const customTags = Array.from(new Set(allDocTags.filter(tag => !map.has(tag))));
    customTags.forEach(tag => {
      if (STONE_TAGS.includes(tag)) {
        map.set(tag, STONE_COLOR);
      } else {
        map.set(tag, MAIN_TAG_COLORS[colorIdx % MAIN_TAG_COLORS.length]);
        colorIdx++;
      }
    });
    return map;
  }, [tagGroups, documents]);

  function getTagColorByName(tag: string) {
    return tagColorMap.get(tag) || MAIN_TAG_COLORS[0];
  }

  // Find all custom tags in use
  const allDocTags = documents.flatMap(doc => doc.tags);
  const customTags = Array.from(new Set(allDocTags.filter(tag => !originalTagSet.has(tag))));

  // Update tag library click handler to add/remove tags from filterTags
  const handleTagClick = (tag: string) => {
    setFilterTags((prev) =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Debug logging for selection and document IDs
  console.log("selectedId (type):", selectedId, typeof selectedId, "filteredDocs:", filteredDocs.map(d => [d.id, typeof d.id]));

  // DocumentListItem component for filename truncation/tooltip logic
  function DocumentListItem({ doc, selected, onSelect, getTagColorByName }: { doc: Document, selected: boolean, onSelect: (id: string) => void, getTagColorByName: (tag: string) => string }) {
    const filenameRef = useRef<HTMLDivElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);
    useEffect(() => {
      const el = filenameRef.current;
      if (el) {
        setIsTruncated(el.scrollWidth > el.clientWidth);
      }
    }, [doc.filename]);
    return (
      <li
        className={`group w-full flex items-start gap-4 p-2 pr-3 shadow-none cursor-pointer transition ring-0 ${selected ? "bg-blue-50" : "bg-white hover:bg-blue-50"}`}
        onClick={() => onSelect(doc.id)}
        style={{ transition: 'all 0.2s cubic-bezier(.4,2,.6,1)' }}
      >
        <FaFileAlt className="text-blue-400 text-xl shrink-0 mt-0.5" />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div
            ref={filenameRef}
            className="font-medium text-gray-700 text-xs truncate w-full overflow-hidden whitespace-nowrap relative"
          >
            {doc.filename}
            {isTruncated && (
              <span className="pointer-events-none absolute left-0 top-full mt-1 z-50 hidden group-hover:block bg-white text-gray-900 text-[10px] px-2 py-1 rounded shadow-lg border border-gray-200 whitespace-pre-line max-w-xs min-w-[10rem] break-all">
                {doc.filename}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {doc.tags && doc.tags.length > 0 && doc.tags.map((tag: string) => (
              <span key={tag} className={`px-1.5 py-0.5 rounded-full border text-[10px] font-semibold shadow-sm ${getTagColorByName(tag)}`}>{tag}</span>
            ))}
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className="light flex h-screen bg-white text-gray-900">
      {/* Left: Upload Section and Document List */}
      <aside className="min-w-[19rem] max-w-[25.5rem] w-full flex flex-col p-5 bg-white border-r border-gray-200 shadow-2xl rounded-r-3xl overflow-y-auto">
        {/* Accordion for Upload Section */}
        <div className="w-full mb-8">
          <div
            className="w-full flex items-center justify-between font-extrabold text-blue-900 text-xl pb-3 cursor-pointer select-none"
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
            className={`overflow-hidden transition-all duration-300 ${uploadOpen ? 'max-h-96 opacity-100 py-4 border-b border-gray-200' : 'max-h-0 opacity-0 py-0 border-b-0'}`}
            aria-hidden={!uploadOpen}
          >
            <div className="flex flex-col gap-2 items-start px-2 w-full">
              {/* Drag and Drop Area */}
              <div
                className={`w-full border-2 border-dashed rounded-lg p-4 mb-2 text-center cursor-pointer transition ${uploading ? 'opacity-60' : 'hover:border-blue-400'}`}
                style={{ minHeight: '60px', background: '#f8fafc' }}
                onClick={() => {
                  if (!uploading && fileInputRef.current) fileInputRef.current.click();
                }}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (uploading) return;
                  const files = Array.from(e.dataTransfer.files);
                  setSelectedFiles(files);
                }}
              >
                {selectedFiles.length === 0 ? (
                  <span className="text-blue-700 font-semibold text-sm">Drag & drop files here, or click to choose file(s)</span>
                ) : (
                  <div className="flex flex-col items-center w-full">
                    <span className="text-xs text-gray-500 mb-1">{selectedFiles.map(f => f.name).join(', ')}</span>
                  </div>
                )}
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  multiple
                  ref={fileInputRef}
                  onChange={e => {
                    if (e.target.files) setSelectedFiles(Array.from(e.target.files));
                  }}
                  disabled={uploading}
                />
              </div>
              {/* Single Button for Upload/Process */}
              {selectedFiles.length > 0 && (
                <button
                  disabled={uploading}
                  className={`w-full py-2 px-6 text-sm font-bold rounded-full shadow-lg transition bg-gradient-to-r from-blue-500 via-purple-500 to-pink-400 text-white hover:from-blue-600 hover:to-pink-500 ${uploading ? 'opacity-60' : ''}`}
                  onClick={async () => {
                    if (selectedFiles.length > 0) {
                      await uploadDocument(selectedFiles);
                    }
                  }}
                >
                  {uploadStatus === "processing"
                    ? "Uploading and Analyzing with AI..."
                    : "Upload and Process"}
                </button>
              )}
              {error && <div className="text-red-600 mt-2 text-sm font-medium">{error}</div>}
            </div>
          </div>
        </div>
        {/* Filter Section above Documents header */}
        <div className="-mt-4 mb-2">
          <div className="text-xs font-bold text-blue-900 mb-1">Filters</div>
          <div className="flex items-center gap-2 flex-wrap">
            {filterTags.length === 0 ? (
              <span className="px-2 py-0.5 rounded-full border text-xs font-semibold shadow-sm bg-gray-100 text-gray-700 border-gray-300">All Documents</span>
            ) : (
              filterTags.map(tag => (
                <span key={tag} className={`px-2 py-0.5 rounded-full border text-xs font-semibold shadow-sm ${getTagColorByName(tag)} flex items-center group transition-all duration-150`}
                  style={{ cursor: 'pointer' }}
                >
                  {tag}
                  <span
                    className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 font-bold"
                    onClick={() => setFilterTags(filterTags.filter(t => t !== tag))}
                    style={{ cursor: 'pointer' }}
                  >
                    ×
                  </span>
                </span>
              ))
            )}
            {filterTags.length > 0 && (
              <span
                className="ml-2 text-xs text-blue-600 underline cursor-pointer hover:text-blue-800"
                onClick={() => setFilterTags([])}
              >
                Clear all
              </span>
            )}
          </div>
        </div>
        {/* Documents List */}
        <h2 className="text-xl font-extrabold mb-2 mt-4 tracking-tight text-blue-900">Documents</h2>
        <ul className="flex-1 overflow-y-auto pr-2">
          {filteredDocs.length === 0 && (
            <li className="text-gray-400 text-center mt-10">No documents found.</li>
          )}
          {filteredDocs.map((doc: Document) => (
            <DocumentListItem
              key={doc.id}
              doc={doc}
              selected={selectedId === doc.id}
              onSelect={handleSelect}
              getTagColorByName={getTagColorByName}
            />
          ))}
        </ul>
      </aside>
      {/* Reset Demo Button at bottom left */}
      <button
        className="fixed left-0 bottom-0 mb-6 ml-6 w-8 h-8 flex items-center justify-center rounded-full bg-white border-2 border-red-300 text-red-600 shadow-md hover:bg-red-50 hover:border-red-500 transition z-20"
        style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.07)' }}
        onClick={async () => {
          if (window.confirm('Are you sure you want to remove all uploaded documents and custom tags? This cannot be undone.')) {
            setUploading(true);
            setError("");
            try {
              const res = await fetch(`${API_BASE}/reset-documents`, { method: 'POST' });
              if (!res.ok) throw new Error('Failed to reset documents');
              await fetchDocuments();
              await fetchTagGroups();
              setSelectedId(null);
              setSelectedDoc(null);
              setFilterTags([]);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : String(e));
            } finally {
              setUploading(false);
            }
          }
        }}
      >
        <FaTrash className="text-base" />
      </button>
      {/* Main Content */}
      <main className="flex-1 flex flex-col pt-3 px-6 pb-6 bg-white min-w-0">
        {/* Tag Library */}
        <section className="mb-8 mt-2">
          <h2 className="text-xl font-extrabold mb-4 tracking-tight text-blue-900">Tag Library</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
            {/* Column 1: Governance, Communications */}
            <div className="flex flex-col">
              {tagGroups[0] && (
                <div className="py-2">
                  <span className="font-medium text-gray-700 text-xs mb-1 ml-0.5">{tagGroups[0].name}</span>
                  <div className="flex flex-wrap gap-y-2 gap-x-0.5">{tagGroups[0].tags.map((tag: string) => (
                    <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition font-semibold border shadow-sm ${getTagColorByName(tag)} ${filterTags.includes(tag) ? 'ring-2 ring-blue-400' : ''}`} onClick={() => handleTagClick(tag)} tabIndex={0} role="button" aria-pressed={filterTags.includes(tag)} style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}>{tag}</span>
                  ))}</div>
                </div>
              )}
              {tagGroups[3] && (
                <div className="py-4">
                  <span className="font-medium text-gray-700 text-xs mb-1 ml-0.5">{tagGroups[3].name}</span>
                  <div className="flex flex-wrap gap-y-2 gap-x-0.5">{tagGroups[3].tags.map((tag: string) => (
                    <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition font-semibold border shadow-sm ${getTagColorByName(tag)} ${filterTags.includes(tag) ? 'ring-2 ring-blue-400' : ''}`} onClick={() => handleTagClick(tag)} tabIndex={0} role="button" aria-pressed={filterTags.includes(tag)} style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}>{tag}</span>
                  ))}</div>
                </div>
              )}
            </div>
            {/* Column 2: Condo specific, Board members orientation & onboarding */}
            <div className="flex flex-col">
              {tagGroups[1] && (
                <div className="py-2">
                  <span className="font-medium text-gray-700 text-xs mb-1 ml-0.5">{tagGroups[1].name}</span>
                  <div className="flex flex-wrap gap-y-2 gap-x-0.5">{tagGroups[1].tags.map((tag: string) => (
                    <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition font-semibold border shadow-sm ${getTagColorByName(tag)} ${filterTags.includes(tag) ? 'ring-2 ring-blue-400' : ''}`} onClick={() => handleTagClick(tag)} tabIndex={0} role="button" aria-pressed={filterTags.includes(tag)} style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}>{tag}</span>
                  ))}</div>
                </div>
              )}
              {tagGroups[4] && (
                <div className="py-4">
                  <span className="font-medium text-gray-700 text-xs mb-1 ml-0.5">{tagGroups[4].name}</span>
                  <div className="flex flex-wrap gap-y-2 gap-x-0.5">{tagGroups[4].tags.map((tag: string) => (
                    <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition font-semibold border shadow-sm ${getTagColorByName(tag)} ${filterTags.includes(tag) ? 'ring-2 ring-blue-400' : ''}`} onClick={() => handleTagClick(tag)} tabIndex={0} role="button" aria-pressed={filterTags.includes(tag)} style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}>{tag}</span>
                  ))}</div>
                </div>
              )}
            </div>
            {/* Column 3: Finance, Insurance, Legal */}
            <div className="flex flex-col">
              {tagGroups[2] && (
                <div className="py-2">
                  <span className="font-medium text-gray-700 text-xs mb-1 ml-0.5">{tagGroups[2].name}</span>
                  <div className="flex flex-wrap gap-y-2 gap-x-0.5">{tagGroups[2].tags.map((tag: string) => (
                    <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition font-semibold border shadow-sm ${getTagColorByName(tag)} ${filterTags.includes(tag) ? 'ring-2 ring-blue-400' : ''}`} onClick={() => handleTagClick(tag)} tabIndex={0} role="button" aria-pressed={filterTags.includes(tag)} style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}>{tag}</span>
                  ))}</div>
                </div>
              )}
              {tagGroups[5] && (
                <div className="py-2 mt-6">
                  <span className="font-medium text-gray-700 text-xs mb-1 ml-0.5">{tagGroups[5].name}</span>
                  <div className="flex flex-wrap gap-y-2 gap-x-0.5">{tagGroups[5].tags.map((tag: string) => (
                    <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition font-semibold border shadow-sm ${getTagColorByName(tag)} ${filterTags.includes(tag) ? 'ring-2 ring-blue-400' : ''}`} onClick={() => handleTagClick(tag)} tabIndex={0} role="button" aria-pressed={filterTags.includes(tag)} style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}>{tag}</span>
                  ))}</div>
                </div>
              )}
              {tagGroups[6] && (
                <div className="py-6 -mt-1">
                  <span className="font-medium text-gray-700 text-xs mb-1 ml-0.5">{tagGroups[6].name}</span>
                  <div className="flex flex-wrap gap-y-2 gap-x-0.5">{tagGroups[6].tags.map((tag: string) => (
                    <span key={tag} className={`text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition font-semibold border shadow-sm ${getTagColorByName(tag)} ${filterTags.includes(tag) ? 'ring-2 ring-blue-400' : ''}`} onClick={() => handleTagClick(tag)} tabIndex={0} role="button" aria-pressed={filterTags.includes(tag)} style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}>{tag}</span>
                  ))}</div>
                </div>
              )}
            </div>
            {/* Custom Tags */}
            {customTags.length > 0 && (
              <div className="col-span-3 w-full mb-4">
                <span className="font-medium text-gray-700 text-xs mb-1 ml-0.5 block">Custom</span>
                <div className="flex flex-wrap gap-y-2 gap-x-1">
                  {customTags.map(tag => (
                    <span
                      key={tag}
                      className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold border shadow-sm cursor-pointer transition ${getTagColorByName(tag)} ${filterTags.includes(tag) ? 'ring-2 ring-blue-400' : ''}`}
                      onClick={() => handleTagClick(tag)}
                      tabIndex={0}
                      role="button"
                      aria-pressed={filterTags.includes(tag)}
                      style={{ transition: 'all 0.15s cubic-bezier(.4,2,.6,1)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
        {/* Restore Document Summary section below tag library */}
        {selectedId && selectedDoc && (
          <section className="bg-white rounded-3xl shadow-2xl py-6 px-4 md:px-10 overflow-y-auto border border-gray-100">
            <h3 className="text-xl font-extrabold mb-6 text-blue-900 tracking-tight">Document Summary</h3>
            <div className="mb-4 text-gray-700 text-base leading-relaxed whitespace-pre-line font-medium">{selectedDoc.summary}</div>
            <div className="mt-6 flex flex-wrap gap-2 items-center">
              <span className="font-semibold text-gray-700">Tags:</span>
              {selectedDoc.tags && selectedDoc.tags.length > 0 ? (
                selectedDoc.tags.map((tag: string) => (
                  <span key={tag} className={`px-2 py-0.5 rounded-full border text-xs font-semibold shadow-sm ${getTagColorByName(tag)}`}>{tag}</span>
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