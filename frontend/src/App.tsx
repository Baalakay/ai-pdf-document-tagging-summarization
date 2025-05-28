import React from "react";
import { Button } from "./components/ui/button";

function App() {
  return (
    <div className="flex h-screen">
      {/* Left: Document List */}
      <aside className="w-1/3 bg-gray-50 border-r border-gray-200 p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Documents</h2>
        <ul className="flex-1 space-y-2 overflow-y-auto">
          {/* Placeholder document items */}
          <li className="p-2 bg-white rounded shadow-sm cursor-pointer">Document 1.pdf</li>
          <li className="p-2 bg-white rounded shadow-sm cursor-pointer">Document 2.pdf</li>
        </ul>
        <div className="mt-4">
          <label className="block mb-2 font-medium">Upload Document</label>
          <input type="file" className="block w-full text-sm" />
          <div className="mt-4">
            <Button variant="default">ShadUI Test Button</Button>
          </div>
        </div>
      </aside>

      {/* Right: Tag Library (top) and Summary (bottom) */}
      <main className="flex-1 flex flex-col p-6">
        {/* Tag Library */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Tag Library</h2>
          <div className="flex flex-wrap gap-2">
            {/* Placeholder tags */}
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded cursor-pointer">Governance</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded cursor-pointer">Meetings</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded cursor-pointer">Finance</span>
            {/* ...more tags */}
          </div>
        </section>
        {/* Document Summary */}
        <section className="flex-1 bg-gray-100 rounded p-4 overflow-y-auto">
          <h3 className="text-md font-semibold mb-2">Document Summary</h3>
          <p className="text-gray-700">Select a document to view its summary here.</p>
        </section>
      </main>
    </div>
  );
}

export default App;
