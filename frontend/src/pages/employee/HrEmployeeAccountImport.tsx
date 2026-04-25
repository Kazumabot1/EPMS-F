import React, { useState } from "react";

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  warnings: string[];
};

const HrEmployeeAccountImport: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const importFile = async (): Promise<void> => {
    if (!file) {
      alert("Please choose CSV or Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const res = await fetch(
        "http://localhost:8080/api/hr/employee-accounts/import",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        throw new Error("Import failed");
      }

      const data: ImportResult = await res.json();
      setResult(data);
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>HR Employee Account Import</h2>

      <input
        type="file"
        accept=".csv,.xlsx"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
          }
        }}
      />

      <br /><br />

      <button onClick={importFile} disabled={loading}>
        {loading ? "Importing..." : "Import"}
      </button>

      {result && (
        <div style={{ marginTop: 20 }}>
          <p>Created: {result.created}</p>
          <p>Updated: {result.updated}</p>
          <p>Skipped: {result.skipped}</p>

          {result.warnings && result.warnings.length > 0 && (
            <>
              <h4>Warnings</h4>
              <ul>
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default HrEmployeeAccountImport;