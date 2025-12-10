import React, { useState } from 'react';
import { Button, CircularProgress } from "@mui/material";
import axios from "axios";
import { getExtension, getVersions } from './languageUtils';

const RunCode = ({ 
  language, 
  codeRef, 
  setOutput,
  onRunComplete
}) => {
  const [loading, setLoading] = useState(false);
  
  const runCode = async () => {
    const sourceCode = codeRef.current?.view?.state?.doc.toString() || "";
    
    if (!sourceCode.trim()) {
      alert("Please write some code first!");
      return;
    }
    
    if (!language) {
      alert("Please select a programming language!");
      return;
    }
    
    setLoading(true);
    
    try {
      let pistonLanguage = language.toLowerCase();
      
      if (pistonLanguage === 'cpp' || pistonLanguage === 'c++') {
        pistonLanguage = 'cpp';
      } else if (pistonLanguage === 'js' || pistonLanguage.includes('javascript')) {
        pistonLanguage = 'javascript';
      } else if (pistonLanguage === 'ts' || pistonLanguage.includes('typescript')) {
        pistonLanguage = 'typescript';
      } else if (pistonLanguage === 'rb' || pistonLanguage.includes('ruby')) {
        pistonLanguage = 'ruby';
      }
      
      const version = getVersions(pistonLanguage);
      const extension = getExtension(pistonLanguage);
      
      const payload = {
        language: pistonLanguage,
        version: version || "*",
        files: [
          {
            name: `my_cool_code${extension || '.txt'}`,
            content: sourceCode,
          },
        ],
      };
      console.log('payload', payload)
      let apiResponse = await axios.post(
        "https://emkc.org/api/v2/piston/execute",
        payload,
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      console.log('apiResponse', apiResponse)
      
      setLoading(false);
      
      const outputData = {
        output: apiResponse.data.run?.output || "",
        stderr: apiResponse.data.run?.stderr || "",
        stdout: apiResponse.data.run?.stdout || ""
      };
      
      if (setOutput) {
        setOutput(outputData);
      }
      
      if (onRunComplete) {
        onRunComplete(outputData);
      }
      
    } catch (error) {
      setLoading(false);
      
      let errorMessage = "An error occurred while executing the code.";
      
      if (error.response) {
        errorMessage = `Server Error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "No response from code execution service.";
      } else {
        errorMessage = `Request Error: ${error.message}`;
      }
      
      const errorData = {
        output: "",
        stderr: errorMessage,
        stdout: ""
      };
      
      if (setOutput) {
        setOutput(errorData);
      }
      
      if (onRunComplete) {
        onRunComplete(errorData);
      }
    }
  };

  return (
    <Button
      onClick={runCode}
      disabled={loading}
      sx={{
        bgcolor: loading ? "#666" : "#1e1e1e",
        color: "white",
        textTransform: "none",
        padding: "6px 16px",
        fontSize: "14px",
        fontWeight: 500,
        borderRadius: "4px",
        minWidth: "100px",
        "&:hover": {
          bgcolor: loading ? "#666" : "#2a2a2a",
        },
        "&:disabled": {
          bgcolor: "#666",
          color: "#ccc",
        }
      }}
      variant="contained"
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
    >
      {loading ? "Running..." : "Run Code"}
    </Button>
  );
};

export default RunCode;