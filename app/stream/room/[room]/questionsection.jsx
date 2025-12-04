"use client";
import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, Button, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { php } from "@codemirror/lang-php";
import { go } from "@codemirror/lang-go";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import "./page.css";

const languageConfig = {
    javascript: {
        extension: javascript(),
        runner: "javascript",
        initialCode:
            "// Write your JavaScript code here\n\nfunction example() {\n  return 'Hello, World!';\n}\n\n// Call your function or write your code below\nconsole.log(example());",
    },
    python: {
        extension: python(),
        runner: "python",
        initialCode:
            "# Write your Python code here\n\ndef example():\n    return 'Hello, World!'\n\n# Call your function or write your code below\nprint(example())",
    },
    java: {
        extension: java(),
        runner: "java",
        initialCode:
            '// Write your Java code here\n\npublic class Solution {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    },
    cpp: {
        extension: cpp(),
        runner: "cpp",
        initialCode:
            '// Write your C++ code here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
    },
    php: {
        extension: php(),
        runner: "php",
        initialCode:
            '<?php\n// Write your PHP code here\n\necho "Hello, World!";\n\n?>',
    },
    go: {
        extension: go(),
        runner: "go",
        initialCode:
            'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
    },
    rust: {
        extension: rust(),
        runner: "rust",
        initialCode:
            '// Write your Rust code here\n\nfn main() {\n    println!("Hello, World!");\n}',
    },
    sql: {
        extension: sql(),
        runner: "sql",
        initialCode:
            "-- Write your SQL queries here\n\nSELECT 'Hello, World!' AS message;",
    },
};

const supportedLanguages = [
    { value: "javascript", label: "JavaScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "php", label: "PHP" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "sql", label: "SQL" },
];

export default function QuestionSection({
    showQuestions,
    questions,
    qIndex,
    code,
    setCode,
    output,
    setOutput,
    showOutput,
    setShowOutput,
    selectedLanguage,
    setSelectedLanguage,
    detectionActive,
    programmingCameraRef,
    theoryCameraRef,
    isStreaming,
    transcript,
}) {
    // 🔹 Mic warning state (moved from LiveRoom)
    const [showMicWarning, setShowMicWarning] = useState(false);
    const lastVoiceTimeRef = useRef(null);
    const lastTranscriptRef = useRef("");

    // Initialize language & code when question changes (same logic as before)
    useEffect(() => {
        if (showQuestions && questions[qIndex].type === "programming") {
            const question = questions[qIndex];

            if (question.language && languageConfig[question.language]) {
                setSelectedLanguage(question.language);
            } else {
                setSelectedLanguage("javascript");
            }

            setCode(languageConfig[selectedLanguage]?.initialCode || "");
            setOutput("");
            setShowOutput(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qIndex, showQuestions]);

    // Reset code when language changes (same as original)
    useEffect(() => {
        if (showQuestions && questions[qIndex].type === "programming") {
            setCode(languageConfig[selectedLanguage]?.initialCode || "");
            setOutput("");
            setShowOutput(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLanguage]);

    // 🔹 Mic warning: handle transcript activity (moved from LiveRoom, unchanged logs)
    useEffect(() => {
        if (!isStreaming || !showQuestions) return;

        if (!lastVoiceTimeRef.current) {
            lastVoiceTimeRef.current = Date.now();
        }

        if (
            transcript !== lastTranscriptRef.current &&
            transcript.trim().length > 0
        ) {
            lastTranscriptRef.current = transcript;
            lastVoiceTimeRef.current = Date.now();

            if (showMicWarning) {
                setShowMicWarning(false);
            }
        }
    }, [transcript, isStreaming, showQuestions, showMicWarning]);

    // 🔹 Mic warning: timer to check inactivity (10s) – same as before
    useEffect(() => {
        if (!isStreaming || !showQuestions) {
            setShowMicWarning(false);
            return;
        }

        const id = setInterval(() => {
            if (!lastVoiceTimeRef.current) return;

            const diff = Date.now() - lastVoiceTimeRef.current;

            if (diff >= 10000) {
                setShowMicWarning(true);
            }
        }, 1000);

        return () => clearInterval(id);
    }, [isStreaming, showQuestions]);

    const runCode = () => {
        if (questions[qIndex].type !== "programming") return;

        try {
            setShowOutput(true); // Show output when code is run

            if (selectedLanguage === "javascript") {
                try {
                    let consoleOutput = [];
                    const originalConsoleLog = console.log;
                    console.log = (...args) => {
                        consoleOutput.push(args.join(" "));
                    };

                    const result = new Function(code)();

                    console.log = originalConsoleLog;

                    if (consoleOutput.length > 0)
                        setOutput(consoleOutput.join("\n"));
                    else if (result !== undefined)
                        setOutput(String(result));
                    else setOutput("Code executed successfully (no output)");
                } catch (err) {
                    setOutput("Error: " + err.message);
                }
            } else {
                const extractedOutput = extractOutputFromCode(
                    selectedLanguage,
                    code
                );
                if (extractedOutput) {
                    setOutput(extractedOutput);
                } else {
                    setOutput(
                        `(${selectedLanguage}) Code execution simulation:\n\nYour code is parsed successfully.\nIn server mode, this would show the real output.\n\nWrite print/println statements to show output here.`
                    );
                }
            }
        } catch (err) {
            setOutput("Error: " + err.message);
            setShowOutput(true);
        }
    };

    if (!showQuestions) return null;

    return (
        <>
            {/* THEORY: question on top, full camera block below */}
            {questions[qIndex].type === "theory" && (
                <>
                    {/* Top: question header & text */}
                    <Box className="question-section">
                        <Box className="q-badge">
                            <img
                                src="/images/question.png"
                                className="q-icon"
                                alt="question icon"
                            />
                            <Typography className="q-number">
                                Question {qIndex + 1}
                            </Typography>
                        </Box>

                        <Box className="q-divider" />

                        <Typography className="question-text">
                            {questions[qIndex].text}
                        </Typography>
                    </Box>

                    {/* Bottom: full-width camera */}
                    <Box className="camera-section">
                        <div
                            ref={theoryCameraRef}
                            className="camera-feed"
                        />

                        {detectionActive &&
                            questions[qIndex].type === "theory" && (
                                <Box
                                    sx={{
                                        position: "absolute",
                                        top: 8,
                                        right: 8,
                                        bgcolor: "rgba(0,0,0,0.7)",
                                        color: "#4caf50",
                                        padding: "4px 8px",
                                        borderRadius: 1,
                                        fontSize: "12px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: "50%",
                                            bgcolor: "#4caf50",
                                            animation: "pulse 2s infinite",
                                        }}
                                    />
                                    Monitoring
                                </Box>
                            )}
                    </Box>
                </>
            )}

            {/* PROGRAMMING QUESTION + CAMERA */}
            {questions[qIndex].type === "programming" && (
                <Box className="programming-layout-container">
                    {/* Left Column - Full height code editor */}
                    <Box className="left-column">
                        {/* Code Editor Section - Takes full height */}
                        <Box className="code-editor-section">
                            <Box className="code-editor-header">
                                <Typography className="section-title">
                                    Code Editor
                                </Typography>
                                <Box className="editor-controls">
                                    <Box className="language-selector-section">
                                        <Typography className="language-label">
                                            Language:
                                        </Typography>
                                        <select
                                            value={selectedLanguage}
                                            onChange={(e) =>
                                                setSelectedLanguage(
                                                    e.target.value
                                                )
                                            }
                                            className="language-dropdown"
                                        >
                                            {supportedLanguages.map((lang) => (
                                                <option
                                                    key={lang.value}
                                                    value={lang.value}
                                                >
                                                    {lang.label}
                                                </option>
                                            ))}
                                        </select>
                                        {questions[qIndex]?.language && (
                                            <Typography className="language-note">
                                                (Suggested:{" "}
                                                {supportedLanguages.find(
                                                    (lang) =>
                                                        lang.value ===
                                                        questions[qIndex]
                                                            .language
                                                )?.label ||
                                                    questions[qIndex]
                                                        .language}
                                                )
                                            </Typography>
                                        )}
                                    </Box>
                                    <IconButton
                                        className="play-btn"
                                        onClick={runCode}
                                        size="small"
                                        title="Run Code"
                                        sx={{
                                            background:
                                                "#4caf50 !important",
                                            color: "white !important",
                                            "&:hover": {
                                                background:
                                                    "#45a049 !important",
                                                transform:
                                                    "scale(1.05) !important",
                                            },
                                        }}
                                    >
                                        <PlayArrowIcon />
                                    </IconButton>
                                </Box>
                            </Box>
                            <Box className="code-editor-container">
                                <CodeMirror
                                    value={code}
                                    height="100%"
                                    extensions={[
                                        languageConfig[selectedLanguage]
                                            ?.extension || javascript(),
                                    ]}
                                    onChange={(value) => setCode(value)}
                                    theme="light"
                                    basicSetup={{
                                        lineNumbers: true,
                                        highlightActiveLine: true,
                                        highlightSelectionMatches: true,
                                        indentOnInput: true,
                                        syntaxHighlighting: true,
                                        bracketMatching: true,
                                        closeBrackets: true,
                                        autocompletion: true,
                                    }}
                                />
                            </Box>
                            <Box className="action-buttons">
                                <Button
                                    className="submit-code-btn"
                                    onClick={runCode}
                                    variant="contained"
                                    size="medium"
                                >
                                    Run Code
                                </Button>
                            </Box>
                        </Box>

                        {/* Output Section - Always visible when there's output */}
                        {showOutput && (
                            <Box className="output-section">
                                <Box className="output-header">
                                    <Typography className="section-title">
                                        Output
                                    </Typography>
                                    <IconButton
                                        className="close-output-btn"
                                        onClick={() => setShowOutput(false)}
                                        size="small"
                                    >
                                        <CloseIcon />
                                    </IconButton>
                                </Box>
                                <Box className="output-container">
                                    <Box className="output-box">
                                        {output || "No output generated"}
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </Box>

                    {/* Right Column - Question and Camera */}
                    <Box className="right-column">
                        {/* Question */}
                        <Box className="question-tab-square">
                            <Box className="q-badge">
                                <img
                                    src="/images/question.png"
                                    className="q-icon"
                                    alt="question icon"
                                />
                                <Typography className="q-number">
                                    Question {qIndex + 1}
                                </Typography>
                            </Box>
                            <Box className="q-divider" />
                            <Typography className="question-text-square">
                                {questions[qIndex].text}
                            </Typography>
                        </Box>

                        {/* Camera */}
                        <Box className="camera-section-square">
                            <div
                                ref={programmingCameraRef}
                                className="camera-feed-square"
                            />

                            {detectionActive &&
                                questions[qIndex].type === "programming" && (
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            top: 8,
                                            right: 8,
                                            bgcolor: "rgba(0,0,0,0.7)",
                                            color: "#4caf50",
                                            padding: "4px 8px",
                                            borderRadius: 1,
                                            fontSize: "12px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: "50%",
                                                bgcolor: "#4caf50",
                                                animation: "pulse 2s infinite",
                                            }}
                                        />
                                        Monitoring
                                    </Box>
                                )}
                        </Box>
                    </Box>
                </Box>
            )}

            {/* 🔹 MIC WARNING POPUP – now inside QuestionSection, theory-only */}
            {showMicWarning &&
                isStreaming &&
                showQuestions &&
                questions[qIndex].type === "theory" && (
                    <Box className="mic-warning-popup">
                        <Typography className="warning-text">
                            We are not receiving your voice. Please check your
                            microphone.
                        </Typography>
                        <IconButton
                            className="close-warning-btn"
                            onClick={() => setShowMicWarning(false)}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                )}
        </>
    );
}

function extractOutputFromCode(language, code) {
    const lines = code.split("\n");
    let output = [];
    let variables = {};

    const arrayRegex =
        /([a-zA-Z_]\w*)\s*=\s*\[?{?([\d,\s-]+)}?\]?/;

    lines.forEach((line) => {
        let trimmed = line.trim();

        const arrMatch = trimmed.match(arrayRegex);
        if (arrMatch) {
            const name = arrMatch[1];
            const arr = arrMatch[2].split(",").map((n) => Number(n.trim()));
            variables[name] = arr;
            return;
        }

        const varMatch = trimmed.match(
            /([a-zA-Z_]\w*)\s*=\s*(.+);?/
        );
        if (
            varMatch &&
            !trimmed.includes("print") &&
            !trimmed.includes("System.out.println")
        ) {
            const name = varMatch[1];
            let expr = varMatch[2];

            if (variables[name] === undefined) {
                try {
                    variables[name] = Function(`return ${expr}`)();
                } catch {
                    variables[name] = expr;
                }
            }
        }
    });

    const resolve = (str) => {
        str = str.trim();

        const maxMatch = str.match(/findMax\((.*?)\)/);
        if (maxMatch) {
            const arrName = maxMatch[1].trim();
            const arr = variables[arrName];
            if (Array.isArray(arr)) {
                return Math.max(...arr);
            }
        }

        return str;
    };

    lines.forEach((line) => {
        let trimmed = line.trim();

        if (trimmed.includes("System.out.println")) {
            const match = trimmed.match(
                /System\.out\.println\((.*)\)/
            );
            if (match) {
                output.push(resolve(match[1]));
            }
        }

        if (trimmed.startsWith("print")) {
            const match = trimmed.match(/print\((.*)\)/);
            if (match) {
                output.push(resolve(match[1]));
            }
        }

        if (trimmed.includes("console.log")) {
            const match = trimmed.match(
                /console\.log\((.*)\)/
            );
            if (match) {
                output.push(resolve(match[1]));
            }
        }
    });

    return output.length ? output.join("\n") : null;
}
