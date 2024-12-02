"use client";

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";

export default function Home() {
  const [code, setCode] = useState('# print("Hello, World!")');
  const [taskId, setTaskId] = useState<string>("");
  interface ResponseData {
    stdout?: string;
    stderr?: string;
    status?: string;
  }
  const apiUrl = "http://localhost:8000";

  const [responseData, setResponseData] = useState<ResponseData | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (taskId) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${apiUrl}/task_result/${taskId}`);
          const data = await response.json();
          setResponseData(data);

          if (data.stdout || data.stderr) {
            clearInterval(interval);
          }
        } catch (error) {
          console.error("Error fetching task result:", error);
          clearInterval(interval);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [taskId]);

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
            {taskId === "" ? (
              <p className="text-gray-800">Your output will appear here.</p>
            ) : responseData && responseData.status ? (
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
                <span>Loading</span>
              </div>
            ) : responseData && responseData.stdout ? (
              <pre className="text-gray-800 whitespace-pre-wrap">
                {responseData.stdout}
              </pre>
            ) : responseData && responseData.stderr ? (
              <div className="flex items-center text-red-600">
                <svg
                  className="h-5 w-5 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 12a1 1 0 102 0V8a1 1 0 10-2 0v4zm1 7a8 8 0 100-16 8 8 0 000 16zm0-18C4.477 1 1 4.477 1 9s3.477 8 8 8 8-3.477 8-8S13.523 1 9 1z"
                    clipRule="evenodd"
                  />
                </svg>
                <pre className="whitespace-pre-wrap">{responseData.stderr}</pre>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="p-2 bg-gray-50 flex justify-center border-t border-gray-300">
        <button
          className="px-6 py-3 text-lg bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={async () => {
            const response = await fetch(`${apiUrl}/execute`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code }),
            });
            const result = await response.json();
            setTaskId(result.taskId);
            setResponseData(null);
          }}
        >
          Run Code
        </button>
      </div>
    </div>
  );
}
