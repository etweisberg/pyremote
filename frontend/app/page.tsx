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
  const [isMalicious, setIsMalicious] = useState<boolean>(false);
  const [listErrors, setListErrors] = useState<
    {
      filename: string;
      line_number: number;
      issue_text: string;
      severity: string;
      confidence: string;
      test_name: string;
    }[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);

  interface ResponseData {
    stdout?: string;
    stderr?: string;
    status?: string;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.pyremote.com";

  const [responseData, setResponseData] = useState<ResponseData | null>(null);

  useEffect(() => {
    // Simulating a list of 1,000 popular Python packages
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
          setResponseData(data);

          if (data.stdout || data.stderr) {
            clearInterval(interval); // Stop polling when task is complete
            setLoading(false); // Stop loading spinner
          }
        } catch (error) {
          console.error("Error fetching task result:", error);
          clearInterval(interval); // Stop polling on error
          setLoading(false);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [taskId]);

  const handleRunCode = async () => {
    try {
      setTaskId(""); // Reset task ID
      setResponseData(null); // Clear previous response
      setIsMalicious(false); // Reset malicious flag
      setListErrors([]); // Clear previous errors
      setLoading(true); // Start loading spinner

      const response = await fetch(`${apiUrl}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, requirements }), // Include requirements
      });

      if (!response.ok) {
        const errorData = await response.json();
        setIsMalicious(true);
        setListErrors(errorData.detail?.issues || []);
        console.error("Malicious Code Detected");
        setLoading(false); // Stop loading spinner
      } else {
        const result = await response.json();
        setTaskId(result.task_id);
      }
    } catch (error) {
      console.error("Error running code:", error);
      setIsMalicious(true);
      setListErrors([
        {
          filename: "",
          line_number: 0,
          issue_text: "Failed to execute the code. Please try again later.",
          severity: "CRITICAL",
          confidence: "UNKNOWN",
          test_name: "execution_error",
        },
      ]);
      setLoading(false); // Stop loading spinner
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
              onChange={(event, newValue) => {
                if (JSON.stringify(newValue) !== JSON.stringify(requirements)) {
                  setRequirements(newValue);
                }
              }}
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
                tagValue.map((option, index) => {
                  const { key, ...otherTagProps } = getTagProps({ index }); // Destructure to exclude `key`
                  return <Chip key={key} label={option} {...otherTagProps} />;
                })
              }
              sx={{
                maxHeight: 300,
                overflowY: "auto",
                marginTop: "16px",
              }}
            />
          </div>
          <div className="bg-white p-4 mt-4 rounded shadow">
            {loading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin h-5 w-5 mr-3 text-gray-800"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018 8V4a8 8 0 00-8 8z"
                  ></path>
                </svg>
                <span>Loading...</span>
              </div>
            ) : isMalicious ? (
              <div className="text-red-600">
                <h2 className="font-bold">Potential Issues Detected:</h2>
                <ul className="mt-2 list-disc list-inside">
                  {listErrors.map((error, index) => (
                    <li key={index}>
                      <p>
                        <strong>File:</strong> {error.filename}, Line:{" "}
                        {error.line_number}
                      </p>
                      <p>
                        <strong>Issue:</strong> {error.issue_text}
                      </p>
                      <p>
                        <strong>Severity:</strong> {error.severity},{" "}
                        <strong>Confidence:</strong> {error.confidence}
                      </p>
                      <p>
                        <strong>Test Name:</strong> {error.test_name}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : responseData && responseData.stdout ? (
              <pre className="text-gray-800 whitespace-pre-wrap">
                {responseData.stdout}
              </pre>
            ) : responseData && responseData.stderr ? (
              <div className="text-red-600">
                <pre className="whitespace-pre-wrap">{responseData.stderr}</pre>
              </div>
            ) : (
              <p className="text-gray-800">Your output will appear here.</p>
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
