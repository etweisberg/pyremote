"use client";

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Autocomplete, TextField, Chip } from "@mui/material";
import packages from "./packages";

export default function Home() {
  const [code, setCode] = useState('# print("Hello, World!")');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [availablePackages, setAvailablePackages] = useState<string[]>([]);
  const [taskId, setTaskId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [liveOutput, setLiveOutput] = useState<string>("");
  const [errorOutput, setErrorOutput] = useState<string>("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    // Initialize the list of available packages
    setAvailablePackages(packages);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (taskId) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${apiUrl}/task_result/${taskId}`);
          if (!response.ok) {
            throw new Error(
              `Error fetching task result: ${response.statusText}`
            );
          }

          const data = await response.json();

          // Update live stdout and stderr
          if (data.stdout) setLiveOutput(data.stdout);
          if (data.stderr) setErrorOutput(data.stderr);

          // Stop polling if task is complete
          if (data.status === "SUCCESS" || data.status === "FAILED") {
            clearInterval(interval);
            setLoading(false);
          }
        } catch (error) {
          console.error("Error fetching task result:", error);
          clearInterval(interval);
          setLoading(false);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [taskId, apiUrl]); // Added apiUrl as a dependency

  const handleRunCode = async () => {
    try {
      setTaskId(""); // Reset task ID
      setLiveOutput(""); // Clear previous output
      setErrorOutput(""); // Clear previous error output
      setLoading(true); // Show loading spinner

      const response = await fetch(`${apiUrl}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, requirements }), // Send code and requirements
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error starting task:", errorData);
        setLoading(false);
        return;
      }

      const result = await response.json();
      setTaskId(result.task_id);
    } catch (error) {
      console.error("Error running code:", error);
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col font-sans">
      <header className="p-5 bg-gray-800 text-white text-center">
        <h1 className="m-0">Python Code Runner</h1>
      </header>
      <div className="flex flex-1">
        <div className="flex-1 border-r border-gray-300">
          <Editor
            height="100%"
            width="100%"
            defaultLanguage="python"
            defaultValue={code}
            onChange={(value) => setCode(value || "")}
            theme="vs-dark"
            options={{ fontSize: 16 }}
          />
        </div>
        <div className="flex-1 bg-gray-100 p-5 overflow-y-auto">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-gray-700 font-bold">Python Dependencies</h2>
            <Autocomplete
              multiple
              id="requirements-selector"
              options={availablePackages}
              getOptionLabel={(option) => option}
              value={requirements}
              onChange={(event, newValue) => setRequirements(newValue)}
              filterSelectedOptions
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label=""
                  placeholder="Search for packages..."
                />
              )}
              renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => (
                  // eslint-disable-next-line react/jsx-key
                  <Chip
                    label={option}
                    {...getTagProps({ index })} // Pass index through getTagProps
                  />
                ))
              }
              sx={{ maxHeight: 300, overflowY: "auto", marginTop: "16px" }}
            />
          </div>
          <div className="bg-white p-4 mt-4 rounded shadow">
            {loading ? (
              <div>
                <h2 className="text-gray-700 font-bold mb-2">Live Output</h2>
                <pre className="text-gray-800 whitespace-pre-wrap">
                  {liveOutput || "Fetching output..."}
                </pre>
                {errorOutput && (
                  <div className="text-red-600 mt-4">
                    <h2 className="font-bold">Errors</h2>
                    <pre className="whitespace-pre-wrap">{errorOutput}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h2 className="text-gray-700 font-bold mb-2">Final Output</h2>
                <pre className="text-gray-800 whitespace-pre-wrap">
                  {liveOutput || "Your output will appear here."}
                </pre>
                {errorOutput && (
                  <div className="text-red-600 mt-4">
                    <h2 className="font-bold">Errors</h2>
                    <pre className="whitespace-pre-wrap">{errorOutput}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="p-2 bg-gray-50 flex justify-center border-t border-gray-300">
        <button
          className="px-6 py-3 text-lg bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={handleRunCode}
        >
          Run Code
        </button>
      </div>
    </div>
  );
}
