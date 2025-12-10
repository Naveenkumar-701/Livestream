// "use client";
// import React, { useEffect, useRef, useState, use } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import { Room, LocalVideoTrack, LocalAudioTrack } from "livekit-client";
// import { Box, Typography, Button, IconButton, CircularProgress } from "@mui/material";
// import CloseIcon from "@mui/icons-material/Close";
// import PlayArrowIcon from "@mui/icons-material/PlayArrow";
// import CodeMirror from "@uiw/react-codemirror";
// import { javascript } from "@codemirror/lang-javascript";
// import { python } from "@codemirror/lang-python";
// import { java } from "@codemirror/lang-java";
// import { cpp } from "@codemirror/lang-cpp";
// import { php } from "@codemirror/lang-php";
// import { go } from "@codemirror/lang-go";
// import { rust } from "@codemirror/lang-rust";
// import { sql } from "@codemirror/lang-sql";
// import SpeechRecognition, {
//     useSpeechRecognition,
// } from "react-speech-recognition";
// import Lottie from "lottie-react";
// import "./page.css"
// import CameraWarning from "../../../component/CameraWarning";
// import { useCameraMonitor } from "../../../utils/CameraDetector";
// import { useDispatch, useSelector } from "react-redux";
// import {
//     addParentQuestion,
//     addFollowUpQuestion,
//     addToFollowupResponse,
//     clearFollowupResponse,
//     setCurrentParentQuestion,
//     logParentCompletion,
//     clearInterviewData,
// } from "../../../redux/interviewSlice.js";

// import "./page.css"
// import useAudioDetection from "../../../utils/useAudioDetection.js";
// import MutedModal from "../../../component/MutedModal.jsx";
// import TTSControls from "../../../component/TTSControls.jsx";
// import { useTTS } from "../../../utils/useTTS.js";


// const LIVEKIT_WS = process.env.NEXT_PUBLIC_LIVEKIT_URL;
// const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// // Employer plans configuration
// const EMPLOYER_PLANS = {
//     growth: { name: "Growth", minutes: 2 },
//     free_trial: { name: "Free Trial", minutes: 2 },
//     business: { name: "Business", minutes: 2 },
//     enterprise: { name: "Enterprise", minutes: 20 }
// };

// // Function to determine question type
// const determineQuestionType = (questionText) => {
//     if (!questionText) return 'General';

//     const q = questionText.toLowerCase();

//     if (q.includes('yourself') || q.includes('about you') || q.includes('introduce')) return 'Introduction';
//     if (q.includes('strength') || q.includes('weakness') || q.includes('experience')) return 'Behavioral';
//     if (q.includes('design') || q.includes('system') || q.includes('architecture')) return 'Technical';
//     if (q.includes('explain') || q.includes('describe') || q.includes('how would')) return 'Scenario';
//     if (q.includes('code') || q.includes('program') || q.includes('write')) return 'Coding';
//     if (q.includes('test') || q.includes('debug') || q.includes('error')) return 'Problem Solving';
//     return 'General';
// };

// // Function to transform API question to app format
// const transformQuestion = (questionFromAPI) => {
//     let type = "theory";
//     if (questionFromAPI.quesType === "coding") {
//         type = "programming";
//     }

//     const result = {
//         _id: questionFromAPI._id,
//         text: questionFromAPI.question,
//         type: type,
//         follow_up_questions: questionFromAPI.follow_up_questions || []
//     };

//     if (type === "programming") {
//         result.language = questionFromAPI.programming_language?.toLowerCase() || "javascript";
//     }

//     return result;
// };

// export default function LiveRoom({ params }) {
//     const router = useRouter();
//     const { room } = use(params);
//     const search = useSearchParams();
//     const name = search.get("name") || "guest";
//     const planType = search.get("plan") || "enterprise";

//     // Redux
//     const dispatch = useDispatch();
//     const { followupResponse } = useSelector(
//         (state) => state.interview
//     );

//     // Follow-up states
//     const [isInFollowUp, setIsInFollowUp] = useState(false);
//     const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState(0);
//     const [followUpQuestions, setFollowUpQuestions] = useState([]);

//     // Camera detection states
//     const [showCameraWarning, setShowCameraWarning] = useState(false);

//     // Use TTS Hook
//     const { 
//         isTTSPlaying, 
//         isReading, 
//         isQuestionRead, 
//         readQuestionAloud, 
//         resetQuestionRead, 
//         stopTTS 
//     } = useTTS();

//     const [viewerCount, setViewer] = useState(0);
//     const [lkRoom, setLkRoom] = useState(null);
//     const [egressId, setEgressId] = useState(null);
//     const egressIdRef = useRef(null);
//     const [isStreaming, setIsStreaming] = useState(false);
//     const screenStreamRef = useRef(null);
//     const joinedRef = useRef(false);
//     const [showQuestions, setShowQuestions] = useState(false);
//     const [qIndex, setQIndex] = useState(0);
//     const [jobTitle, setJobTitle] = useState("");

//     // Questions state
//     const [questions, setQuestions] = useState([]);
//     const [questionsLoading, setQuestionsLoading] = useState(true);
//     const [questionsError, setQuestionsError] = useState(null);
//     const [screenShareStarting, setScreenShareStarting] = useState(false);

//     // Egress starting flag for loader while egress API is in-flight
//     const [egressStarting, setEgressStarting] = useState(false);
//     const [isLoadingNext, setIsLoadingNext] = useState(false);

//     // Timer states
//     const [timeLeft, setTimeLeft] = useState(0);
//     const [totalDuration, setTotalDuration] = useState(0);
//     const [currentSlot, setCurrentSlot] = useState(1);
//     const [isTimeUp, setIsTimeUp] = useState(false);
//     const timerRef = useRef(null);
//     const alertTimeoutRef = useRef(null);

//     // Remove expand state, keep output visibility state
//     const [showOutput, setShowOutput] = useState(false);

//     const [selectedLanguage, setSelectedLanguage] = useState("javascript");

//     // Language configuration mapping with initial code templates
//     const languageConfig = {
//         javascript: {
//             extension: javascript(),
//             runner: "javascript",
//             initialCode: "// Write your JavaScript code here\n\nfunction example() {\n  return 'Hello, World!';\n}\n\n// Call your function or write your code below\nconsole.log(example());"
//         },
//         python: {
//             extension: python(),
//             runner: "python",
//             initialCode: "# Write your Python code here\n\ndef example():\n    return 'Hello, World!'\n\n# Call your function or write your code below\nprint(example())"
//         },
//         java: {
//             extension: java(),
//             runner: "java",
//             initialCode: "// Write your Java code here\n\npublic class Solution {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}"
//         },
//         cpp: {
//             extension: cpp(),
//             runner: "cpp",
//             initialCode: "// Write your C++ code here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello, World!\" << endl;\n    return 0;\n}"
//         },
//         php: {
//             extension: php(),
//             runner: "php",
//             initialCode: "<?php\n// Write your PHP code here\n\necho \"Hello, World!\";\n\n?>"
//         },
//         go: {
//             extension: go(),
//             runner: "go",
//             initialCode: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello, World!\")\n}"
//         },
//         rust: {
//             extension: rust(),
//             runner: "rust",
//             initialCode: "// Write your Rust code here\n\nfn main() {\n    println!(\"Hello, World!\");\n}"
//         },
//         sql: {
//             extension: sql(),
//             runner: "sql",
//             initialCode: "-- Write your SQL queries here\n\nSELECT 'Hello, World!' AS message;"
//         }
//     };

//     // Supported languages for dropdown
//     const supportedLanguages = [
//         { value: "javascript", label: "JavaScript" },
//         { value: "python", label: "Python" },
//         { value: "java", label: "Java" },
//         { value: "cpp", label: "C++" },
//         { value: "php", label: "PHP" },
//         { value: "go", label: "Go" },
//         { value: "rust", label: "Rust" },
//         { value: "sql", label: "SQL" }
//     ];

//     // Helper functions to get current question
//     const getCurrentQuestion = () => {
//         if (isInFollowUp && followUpQuestions.length > 0) {
//             return followUpQuestions[currentFollowUpIndex] || null;
//         }
//         return questions[qIndex] || null;
//     };

//     const getCurrentQuestionType = () => {
//         if (isInFollowUp && followUpQuestions.length > 0) {
//             return followUpQuestions[currentFollowUpIndex]?.type || "theory";
//         }
//         return questions[qIndex]?.type || "theory";
//     };

//     // TTS handler function
//     const handleReadQuestion = async () => {
//         const currentQ = getCurrentQuestion();
//         if (currentQ && currentQ.text) {
//             await readQuestionAloud(currentQ.text);
//         }
//     };

//     // Initialize timer based on plan
//     useEffect(() => {
//         const plan = EMPLOYER_PLANS[planType] || EMPLOYER_PLANS.free_trial;
//         const durationInSeconds = plan.minutes * 60;
//         setTotalDuration(durationInSeconds);
//         setTimeLeft(durationInSeconds);

//         console.log(`Timer initialized: ${plan.name} Plan - ${plan.minutes} minutes`);

//         return () => {
//             if (timerRef.current) {
//                 clearInterval(timerRef.current);
//             }
//             if (alertTimeoutRef.current) {
//                 clearTimeout(alertTimeoutRef.current);
//             }
//         };
//     }, [planType]);

//     // Timer countdown - ALWAYS start when streaming
//     useEffect(() => {
//         if (isStreaming && timeLeft > 0 && !isTimeUp) {
//             timerRef.current = setInterval(() => {
//                 setTimeLeft(prev => {
//                     if (prev <= 1) {
//                         console.log("Time up detected");
//                         handleTimeUp();
//                         return 0;
//                     }
//                     return prev - 1;
//                 });
//             }, 1000);
//         }

//         return () => {
//             if (timerRef.current) {
//                 clearInterval(timerRef.current);
//             }
//         };
//     }, [isStreaming, timeLeft, isTimeUp]);

//     // Time up handler
//     const handleTimeUp = () => {
//         if (isTimeUp) return;

//         console.log("Handling time up...");
//         setIsTimeUp(true);

//         if (timerRef.current) {
//             clearInterval(timerRef.current);
//         }

//         const plan = EMPLOYER_PLANS[planType] || EMPLOYER_PLANS.free_trial;

//         if (alertTimeoutRef.current) {
//             clearTimeout(alertTimeoutRef.current);
//         }

//         alertTimeoutRef.current = setTimeout(() => {
//             const nextSlot = currentSlot + 1;
//             console.log(`Slot ${currentSlot} completed. Starting Slot ${nextSlot}`);
//             console.log(`Starting Slot ${nextSlot}: ${plan.minutes} minutes`);

//             alert(`🔄 Slot ${currentSlot} completed! Starting Slot ${nextSlot}`);

//             setCurrentSlot(nextSlot);
//             const newDuration = plan.minutes * 60;
//             setTimeLeft(newDuration);
//             setIsTimeUp(false);
//         }, 100);
//     };

//     // Format time for display (MM:SS)
//     const formatTime = (seconds) => {
//         const mins = Math.floor(seconds / 60);
//         const secs = seconds % 60;
//         return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//     };

//     // Get current plan info
//     const getCurrentPlan = () => {
//         return EMPLOYER_PLANS[planType] || EMPLOYER_PLANS.free_trial;
//     };

//     useEffect(() => {
//         if (currentSlot > 1) {
//             console.log(`User moved to Slot ${currentSlot}`);
//         }
//     }, [currentSlot]);

//     // Update code when language changes
//     useEffect(() => {
//         if (showQuestions && questions.length > 0 && getCurrentQuestionType() === "programming") {
//             setCode(languageConfig[selectedLanguage]?.initialCode || "");
//             setOutput("");
//             setShowOutput(false);
//         }
//     }, [selectedLanguage]);

//     // Speech recognition
//     const {
//         transcript,
//         listening,
//         resetTranscript,
//         browserSupportsSpeechRecognition,
//     } = useSpeechRecognition();

//     // timestamps
//     const [streamStartTime, setStreamStartTime] = useState(null);
//     const [currentAnswerStartTime, setCurrentAnswerStartTime] = useState(null);
//     const [questionLogs, setQuestionLogs] = useState([]);

//     const forcedStopRef = useRef(false);
//     const mediaTracksRef = useRef([]);

//     // mic silence detect + audio detection
//     const [showMicWarning, setShowMicWarning] = useState(false);
//     const lastVoiceTimeRef = useRef(null);
//     const lastTranscriptRef = useRef("");


//     // Programming question states
//     const [code, setCode] = useState("");
//     const [output, setOutput] = useState("");
//     const [testResults, setTestResults] = useState([]);

//     // Camera refs
//     const theoryCameraRef = useRef(null);
//     const programmingCameraRef = useRef(null);
//     const videoTrackRef = useRef(null);

//     // Initialize question state when it changes
//     useEffect(() => {
//         if (showQuestions && questions.length > 0) {
//             const currentQ = getCurrentQuestion();

//             if (currentQ?.type === "programming") {
//                 if (currentQ.language && languageConfig[currentQ.language]) {
//                     setSelectedLanguage(currentQ.language);
//                 } else {
//                     setSelectedLanguage("javascript");
//                 }

//                 setCode(languageConfig[selectedLanguage]?.initialCode || "");
//                 setOutput("");
//                 setShowOutput(false);
//             } else {
//                 resetTranscript();
//             }

//             // Reset question read state when question changes
//             resetQuestionRead();
//         }
//     }, [qIndex, isInFollowUp, currentFollowUpIndex, showQuestions]);

//     // Auto-read question when it changes
//     useEffect(() => {
//         const currentQ = getCurrentQuestion();
//         if (currentQ && currentQ.text && showQuestions && isStreaming) {
//             // Auto-read question when it changes
//             handleReadQuestion();
//         }
//     }, [qIndex, isInFollowUp, currentFollowUpIndex, showQuestions, isStreaming]);

//     // Fetch questions from backend
//     useEffect(() => {
//         const fetchQuestions = async () => {
//             try {
//                 setQuestionsLoading(true);
//                 const response = await fetch('http://localhost:5000/api/interview/questions/69291ac03b7bfc5ced309c57');
//                 const data = await response.json();

//                 if (data.ok && data.questions) {
//                     const transformedQuestions = data.questions.map(transformQuestion);
//                     setQuestions(transformedQuestions);
//                     if (data.job_title) {
//                         setJobTitle(data.job_title);
//                     }

//                     transformedQuestions.forEach((q, index) => {
//                         if (q.follow_up_questions && q.follow_up_questions.length > 0) {
//                             console.log(`Question ${index + 1} has ${q.follow_up_questions.length} follow-up(s)`);
//                         }
//                     });

//                     if (isStreaming) {
//                         setShowQuestions(true);
//                         setQIndex(0);
//                     }
//                 } else {
//                     throw new Error('Invalid response from API');
//                 }
//             } catch (error) {
//                 setQuestionsError(error.message);
//             } finally {
//                 setQuestionsLoading(false);
//             }
//         };

//         fetchQuestions();
//     }, []);

//     // Show questions when loaded and streaming
//     useEffect(() => {
//         if (!questionsLoading && isStreaming && questions.length > 0 && !showQuestions) {
//             setShowQuestions(true);
//             setQIndex(0);
//         }
//     }, [questionsLoading, isStreaming, questions.length, showQuestions]);

//     // Update camera display when question type changes
//     useEffect(() => {
//         if (videoTrackRef.current && showQuestions && questions.length > 0) {
//             updateCameraDisplay();
//         }
//     }, [qIndex, isInFollowUp, currentFollowUpIndex, showQuestions, questions.length]);

//     const updateCameraDisplay = () => {
//         if (!videoTrackRef.current) return;

//         const currentQuestionType = getCurrentQuestionType();
//         const currentCameraRef = currentQuestionType === "programming"
//             ? programmingCameraRef
//             : theoryCameraRef;

//         const otherCameraRef = currentQuestionType === "programming"
//             ? theoryCameraRef
//             : programmingCameraRef;

//         // Attach to current camera
//         if (currentCameraRef.current) {
//             attachToElement(videoTrackRef.current, currentCameraRef.current);
//         }

//         if (otherCameraRef.current) {
//             clearElement(otherCameraRef.current);
//         }
//     };

//     const handleCameraWarning = (warningCount) => {
//         setShowCameraWarning(true);
//     };

//     const handleCameraStop = (reasonMessage, isManualStop) => {
//         stopEverything(reasonMessage, isManualStop);
//     };

//     // Camera monitoring using the custom hook
//     useCameraMonitor(isStreaming, handleCameraWarning, handleCameraStop);

//     const runCode = () => {
//         const currentQ = getCurrentQuestion();

//         if (!questions.length || currentQ?.type !== "programming") {
//             return;
//         }

//         try {
//             setShowOutput(true);

//             if (selectedLanguage === "javascript") {
//                 try {
//                     let consoleOutput = [];
//                     const originalConsoleLog = console.log;
//                     console.log = (...args) => {
//                         consoleOutput.push(args.join(" "));
//                     };

//                     const result = new Function(code)();

//                     console.log = originalConsoleLog;

//                     if (consoleOutput.length > 0) {
//                         setOutput(consoleOutput.join("\n"));
//                     } else if (result !== undefined) {
//                         setOutput(String(result));
//                     } else {
//                         setOutput("Code executed successfully (no output)");
//                     }
//                 } catch (err) {
//                     setOutput("Error: " + err.message);
//                 }
//             } else {
//                 const extractedOutput = extractOutputFromCode(selectedLanguage, code);
//                 if (extractedOutput) {
//                     setOutput(extractedOutput);
//                 } else {
//                     setOutput(
//                         `(${selectedLanguage}) Code execution simulation:

// Your code is parsed successfully.
// In server mode, this would show the real output.

// Write print/println statements to show output here.`
//                     );
//                 }
//             }
//         } catch (err) {
//             setOutput("Error: " + err.message);
//             setShowOutput(true);
//         }
//     };

//     const extractOutputFromCode = (language, code) => {
//         const lines = code.split("\n");
//         let output = [];
//         let variables = {};

//         const arrayRegex = /([a-zA-Z_]\w*)\s*=\s*\[?{?([\d,\s-]+)}?\]?/;

//         lines.forEach(line => {
//             let trimmed = line.trim();

//             const arrMatch = trimmed.match(arrayRegex);
//             if (arrMatch) {
//                 const name = arrMatch[1];
//                 const arr = arrMatch[2]
//                     .split(",")
//                     .map(n => Number(n.trim()));
//                 variables[name] = arr;
//                 return;
//             }

//             const varMatch = trimmed.match(/([a-zA-Z_]\w*)\s*=\s*(.+);?/);
//             if (varMatch && !trimmed.includes("print") && !trimmed.includes("System.out.println")) {
//                 const name = varMatch[1];
//                 let expr = varMatch[2];

//                 if (variables[name] === undefined) {
//                     try {
//                         variables[name] = Function(`return ${expr}`)();
//                     } catch {
//                         variables[name] = expr;
//                     }
//                 }
//             }
//         });

//         const resolve = (str) => {
//             str = str.trim();

//             const maxMatch = str.match(/findMax\((.*?)\)/);
//             if (maxMatch) {
//                 const arrName = maxMatch[1].trim();
//                 const arr = variables[arrName];
//                 if (Array.isArray(arr)) {
//                     return Math.max(...arr);
//                 }
//             }

//             return str;
//         };

//         lines.forEach(line => {
//             let trimmed = line.trim();

//             if (trimmed.includes("System.out.println")) {
//                 const match = trimmed.match(/System\.out\.println\((.*)\)/);
//                 if (match) {
//                     output.push(resolve(match[1]));
//                 }
//             }

//             if (trimmed.startsWith("print")) {
//                 const match = trimmed.match(/print\((.*)\)/);
//                 if (match) {
//                     output.push(resolve(match[1]));
//                 }
//             }

//             if (trimmed.includes("console.log")) {
//                 const match = trimmed.match(/console\.log\((.*)\)/);
//                 if (match) {
//                     output.push(resolve(match[1]));
//                 }
//             }
//         });

//         return output.length ? output.join("\n") : null;
//     };

//     // Safe DOM manipulation functions
//     const attachToElement = (track, element) => {
//         if (!element) return;

//         try {
//             clearElement(element);

//             const videoElement = track.attach();
//             videoElement.muted = true;
//             videoElement.playsInline = true;
//             videoElement.style.width = "100%";
//             videoElement.style.height = "100%";
//             videoElement.style.objectFit = "cover";

//             element.appendChild(videoElement);
//         } catch (error) {
//             console.error("Error attaching camera:", error);
//         }
//     };

//     const clearElement = (element) => {
//         if (!element) return;

//         try {
//             while (element.firstChild) {
//                 const child = element.firstChild;
//                 if (child.tagName === 'VIDEO') {
//                     child.srcObject = null;
//                 }
//                 element.removeChild(child);
//             }
//         } catch (error) {
//             console.error("Error clearing element:", error);
//         }
//     };

//     const stopAllTracks = () => {
//         try {
//             mediaTracksRef.current.forEach(track => {
//                 try {
//                     track.stop();
//                 } catch (e) { }
//             });
//             mediaTracksRef.current = [];

//             if (videoTrackRef.current) {
//                 try {
//                     videoTrackRef.current.stop();
//                 } catch (e) { }
//                 videoTrackRef.current = null;
//             }

//             if (!lkRoom || !lkRoom.localParticipant) return;

//             lkRoom.localParticipant.tracks?.forEach((pub) => {
//                 try {
//                     pub.track?.stop();
//                 } catch { }
//             });

//             lkRoom.localParticipant.videoTracks?.forEach((pub) => {
//                 try {
//                     pub.track?.mediaStreamTrack?.stop();
//                 } catch { }
//             });

//             lkRoom.localParticipant.audioTracks?.forEach((pub) => {
//                 try {
//                     pub.track?.mediaStreamTrack?.stop();
//                 } catch { }
//             });

//             lkRoom.localParticipant.tracks?.forEach((pub) => {
//                 if (pub.source === "screen_share") {
//                     try {
//                         pub.track?.mediaStreamTrack?.stop();
//                     } catch { }
//                 }
//             });

//             if (screenStreamRef.current) {
//                 screenStreamRef.current.getTracks().forEach((t) => {
//                     try { t.stop(); } catch { }
//                 });
//                 screenStreamRef.current = null;
//             }

//         } catch (e) {
//             console.error("stop error:", e);
//         }
//     };

//     const forceStopEgress = async () => {
//         const id = egressIdRef.current;
//         if (!id) {
//             console.warn("No egressId available, skipping egress stop");
//             return;
//         }

//         for (let i = 0; i < 3; i++) {
//             try {
//                 console.log("Attempting to stop egress...", i + 1);

//                 const res = await fetch(`${API_BASE}/egress/stop`, {
//                     method: "POST",
//                     headers: { "Content-Type": "application/json" },
//                     body: JSON.stringify({ egressId: id }),
//                 });

//                 const j = await res.json();
//                 console.log("EGRESS STOP RESPONSE:", j);

//                 if (j.ok) {
//                     console.log("Egress stopped successfully");
//                     return;
//                 }
//             } catch (err) {
//                 console.error("Egress stop failed attempt:", i + 1, err);
//             }

//             await new Promise((r) => setTimeout(r, 300));
//         }

//         console.error("Failed to stop egress after 3 attempts");
//     };

//     // Function to log Q&A in structured format
//     const logQnA = (question, answer, startTime, endTime, isFollowUp = false, followUpIndex = null, isAIGenerated = false) => {

//         const displayIndex = isFollowUp ? (followUpIndex + 1) : 0;

//         const logEntry = {
//             questionType: determineQuestionType(question),
//             question: question,
//             candAns: answer,
//             startTime: startTime,
//             endTime: endTime,
//             slotNumber: currentSlot,
//             isFollowUp: isFollowUp,
//             isAIGenerated: isAIGenerated,
//             displayIndex: displayIndex,
//             ...(isFollowUp && {
//                 followUpIndex: followUpIndex,
//                 parentQuestionIndex: qIndex
//             })
//         };

//         console.log('ANSWER SAVED ---', {
//             index: displayIndex,
//             type: isFollowUp ? 'follow-up' : 'parent',
//             question: question?.substring(0, 50),
//             answer: answer?.substring(0, 50),
//             parent: isFollowUp ? `Q${qIndex + 1}` : null
//         });

//         // Also save to questionLogs array
//         setQuestionLogs((prev) => [...prev, logEntry]);
//     };

//     const stopEverything = async (
//         reasonMessage = "Live stopped.",
//         isManualStop = false
//     ) => {
//         if (forcedStopRef.current) return;
//         forcedStopRef.current = true;

//         console.log("Stopping everything - Saving last question...");

//         // Stop TTS if playing
//         stopTTS();

//         try {
//             if (screenStreamRef.current) {
//                 screenStreamRef.current.getTracks().forEach(t => t.stop());
//                 screenStreamRef.current = null;
//             }
//         } catch { }

//         // 1. FIRST: Save the current/last question to Redux and local logs
//         if (showQuestions && questions.length > 0) {
//             const currentQ = getCurrentQuestion();
//             const endTime = Date.now();

//             if (currentQ) {
//                 const currentAnswer = currentQ.type === "theory" ? transcript.trim() : (code || "No code submitted");

//                 if (currentAnswer.trim() !== "") {
//                     console.log("💾 Saving last question before stopping...");

//                     // Save to Redux with proper indexing
//                     if (!isInFollowUp) {
//                         // Save as parent question (index 0)
//                         console.log(`💾 Last question: Parent Q${qIndex + 1} (Index 0)`);
//                         dispatch(
//                             addParentQuestion({
//                                 questionIndex: qIndex,
//                                 question: currentQ.text,
//                                 answer: currentAnswer,
//                                 quesType: currentQ.type === "programming" ? "coding" : "theory",
//                                 language: selectedLanguage,
//                             })
//                         );
//                     } else {
//                         // Save as follow-up (index = currentFollowUpIndex + 1)
//                         console.log(`💾 Last question: Follow-up ${currentFollowUpIndex + 1} of Q${qIndex + 1}`);
//                         dispatch(
//                             addFollowUpQuestion({
//                                 questionIndex: qIndex,
//                                 followUpIndex: currentFollowUpIndex,
//                                 question: currentQ.text,
//                                 answer: currentAnswer,
//                                 quesType: currentQ.type === "programming" ? "coding" : "theory",
//                                 language: selectedLanguage,
//                             })
//                         );
//                     }

//                     // Also save to followupResponse for completeness
//                     dispatch(
//                         addToFollowupResponse({
//                             question: currentQ.text,
//                             candiAnswer: currentAnswer,
//                             quesType: currentQ.type === "programming" ? "coding" : "theory",
//                             language: selectedLanguage,
//                             followUpIndex: isInFollowUp ? currentFollowUpIndex : 0,
//                         })
//                     );
//                 }

//                 // 2. Log locally with proper follow-up index
//                 if (currentQ.type === "theory") {
//                     logQnA(
//                         currentQ.text,
//                         currentAnswer,
//                         currentAnswerStartTime,
//                         endTime,
//                         isInFollowUp,
//                         currentFollowUpIndex,
//                         currentQ.isAIGenerated || false
//                     );
//                 } else if (currentQ.type === "programming") {
//                     logQnA(
//                         currentQ.text,
//                         currentAnswer,
//                         currentAnswerStartTime,
//                         endTime,
//                         isInFollowUp,
//                         currentFollowUpIndex,
//                         currentQ.isAIGenerated || false
//                     );
//                 }

//                 // 3. Log parent completion if needed
//                 if (isInFollowUp) {
//                     dispatch(logParentCompletion({
//                         questionIndex: qIndex,
//                         questionText: questions[qIndex]?.text,
//                         followUpCount: followUpQuestions.length
//                     }));
//                 }
//             }
//         } else {
//             console.log("⚠️ No active question to save before stopping");
//         }

//         try {
//             SpeechRecognition.stopListening();
//         } catch (e) {
//             console.error("Speech stop error:", e);
//         }

//         try {
//             stopAllTracks();
//         } catch (e) {
//             console.error("Track stop error:", e);
//         }

//         try {
//             await forceStopEgress();
//         } catch (e) {
//             console.error("Egress stop error:", e);
//         }

//         setIsStreaming(false);
//         setShowMicWarning(false);
//         setShowCameraWarning(false);

//         window.location.href = "/camera-issue";

//         // Clear timer
//         if (timerRef.current) {
//             clearInterval(timerRef.current);
//         }
//         if (alertTimeoutRef.current) {
//             clearTimeout(alertTimeoutRef.current);
//         }

//         await new Promise((r) => setTimeout(r, 300));

//         try {
//             lkRoom?.disconnect();
//         } catch (e) {
//             console.error("Room disconnect error:", e);
//         }

//         navigator.mediaDevices.getUserMedia({ video: true, audio: true })
//             .then(stream => {
//                 stream.getTracks().forEach(track => track.stop());
//             })
//             .catch(() => { });

//         // 4. Log all questions with proper indexing
//         console.log("========= FINAL ALL QUESTION LOGS =========");
//         console.log(`Total slots used: ${currentSlot}`);
//         console.log(`Total questions attempted: ${questionLogs.length}`);
//         console.log(`Current question index: Q${qIndex + 1}`);
//         console.log(`In follow-up mode: ${isInFollowUp}`);
//         console.log(`Current follow-up index: ${currentFollowUpIndex}`);
//         console.log(`Total follow-up questions: ${followUpQuestions.length}`);
//         console.log("===========================================");

//         // Group questions by parent for better readability
//         const groupedByParent = {};
//         questionLogs.forEach((log, index) => {
//             const parentKey = log.isFollowUp ? `Q${qIndex + 1}` : `Q${index + 1}`;

//             if (!groupedByParent[parentKey]) {
//                 groupedByParent[parentKey] = [];
//             }

//             groupedByParent[parentKey].push({
//                 index: log.isFollowUp ? log.followUpIndex : 0,
//                 type: log.isFollowUp ? 'follow-up' : 'parent',
//                 ...log
//             });
//         });

//         // Log grouped questions
//         Object.keys(groupedByParent).sort().forEach(parentKey => {
//             console.log(`\n${parentKey}:`);
//             const logs = groupedByParent[parentKey].sort((a, b) => a.index - b.index);

//             logs.forEach(log => {
//                 const typeLabel = log.type === 'parent' ? 'PARENT' : `FOLLOW-UP ${log.index}`;
//                 console.log(`  [${log.index}] ${typeLabel}: ${log.question?.substring(0, 80)}...`);
//                 console.log(`      Answer: ${log.candAns?.substring(0, 80)}...`);
//                 console.log(`      Type: ${log.questionType}, AI: ${log.isAIGenerated}, Duration: ${log.endTime - log.startTime}ms`);
//             });
//         });

//         console.log("\n===========================================");

//         // 5. Show final Redux log
//         console.log("🎯 Triggering final Redux log before clearing...");

//         // Small delay to ensure all logs are captured
//         await new Promise(resolve => setTimeout(resolve, 100));

//         // Clear Redux data (this will also log the final state)
//         dispatch(clearInterviewData());

//         // 6. Additional debug logging
//         console.log("📊 Final State Summary:");
//         console.log(`- Questions loaded: ${questions.length}`);
//         console.log(`- Questions answered: ${questionLogs.length}`);
//         console.log(`- Current Q Index: ${qIndex}`);
//         console.log(`- In Follow-up: ${isInFollowUp}`);
//         console.log(`- Follow-up Index: ${currentFollowUpIndex}`);
//         console.log(`- Follow-up Questions count: ${followUpQuestions.length}`);
//         console.log(`- Transcript length: ${transcript.length}`);
//         console.log(`- Code length: ${code.length}`);

//         if (reasonMessage) {
//             alert(reasonMessage);
//         }

//         // Small delay before redirecting
//         await new Promise(resolve => setTimeout(resolve, 500));

//         router.push("/stream");
//     };

//     const handleBeforeUnload = (event) => {
//         if (isStreaming) {
//             event.preventDefault();
//             event.returnValue = "You have an active live stream. Are you sure you want to leave?";
//             return event.returnValue;
//         }
//     };

//     const handleVisibilityChange = () => {
//         if (document.hidden && isStreaming) {
//             console.warn("Tab became hidden while streaming");
//         }
//     };

//     useEffect(() => {
//         if (!room || joinedRef.current) return;
//         joinedRef.current = true;

//         joinRoom(room);

//         window.addEventListener("beforeunload", handleBeforeUnload);
//         document.addEventListener("visibilitychange", handleVisibilityChange);

//         return () => {
//             try {
//                 stopAllTracks();
//                 lkRoom?.disconnect();
//                 if (timerRef.current) {
//                     clearInterval(timerRef.current);
//                 }
//                 if (alertTimeoutRef.current) {
//                     clearTimeout(alertTimeoutRef.current);
//                 }
//             } catch { }
//             SpeechRecognition.stopListening();

//             window.removeEventListener("beforeunload", handleBeforeUnload);
//             document.removeEventListener("visibilitychange", handleVisibilityChange);
//         };
//     }, [room]);

//     // Screen share
//     const startScreenShare = async (roomObj) => {
//         try {
//             console.log("Starting screen share...");
//             const screenStream = await navigator.mediaDevices.getDisplayMedia({
//                 video: {
//                     cursor: "always",
//                     displaySurface: "monitor",
//                 },
//                 audio: false,
//                 selfBrowserSurface: "exclude",
//                 systemAudio: "exclude",
//                 surfaceSwitching: "exclude",
//             });

//             screenStreamRef.current = screenStream;
//             const videoTrack = screenStream.getVideoTracks()[0];
//             const settings = videoTrack.getSettings();

//             mediaTracksRef.current.push(videoTrack);

//             if (settings.displaySurface !== "monitor") {
//                 try { videoTrack.stop(); } catch (e) { }
//                 alert("Please select ENTIRE SCREEN");
//                 setTimeout(() => startScreenShare(roomObj), 1000);
//                 return;
//             }

//             const screenTrack = new LocalVideoTrack(videoTrack);

//             videoTrack.onended = () => {
//                 console.warn("Screen share manually stopped");
//                 stopEverything(
//                     "Screen share was stopped. Live stream will stop.",
//                     true
//                 );
//             };

//             await roomObj.localParticipant.publishTrack(screenTrack);
//             console.log("Full Screen Share Published");

//             await startEgress(room);
//         } catch (err) {
//             console.error("Screen share error:", err);
//         }
//     };

//     const joinRoom = async (roomName) => {
//         try {
//             console.log("Starting room join process...");
//             const tokenRes = await fetch(`${API_BASE}/token`, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                     roomName: roomName,
//                     identity: name
//                 }),
//             });
//             const { token } = await tokenRes.json();

//             const r = new Room();
//             await r.connect(LIVEKIT_WS, token);
//             setLkRoom(r);

//             // Get camera stream
//             const camStream = await navigator.mediaDevices.getUserMedia({
//                 video: {
//                     width: { ideal: 1280 },
//                     height: { ideal: 720 },
//                     frameRate: { ideal: 30 }
//                 },
//                 audio: false,
//             });

//             const [vTrackRaw] = camStream.getVideoTracks();
//             mediaTracksRef.current.push(vTrackRaw);

//             vTrackRaw.onended = () => {
//                 console.warn("Camera manually turned off");
//                 stopEverything(
//                     "Camera was turned off manually. Live stream will stop.",
//                     true
//                 );
//             };

//             const vTrack = new LocalVideoTrack(vTrackRaw);
//             videoTrackRef.current = vTrack;

//             if (theoryCameraRef.current) {
//                 attachToElement(vTrack, theoryCameraRef.current);
//             }

//             await r.localParticipant.publishTrack(vTrack);

//             // Get microphone stream
//             const micStream = await navigator.mediaDevices.getUserMedia({
//                 audio: {
//                     echoCancellation: true,
//                     noiseSuppression: true,
//                     autoGainControl: true
//                 },
//             });
//             const [micRaw] = micStream.getAudioTracks();
//             mediaTracksRef.current.push(micRaw);

//             micRaw.onended = () => {
//                 console.warn("Microphone manually turned off");
//                 stopEverything(
//                     "Microphone was turned off manually. Live stream will stop.",
//                     true
//                 );
//             };

//             const aTrack = new LocalAudioTrack(micRaw);
//             await r.localParticipant.publishTrack(aTrack);

//             await startScreenShare(r);

//             const updateCount = () => {
//                 if (!r || r.state !== "connected" || !r.participants) return;
//                 setViewer(r.participants.size + 1);
//             };

//             r.on("participantConnected", updateCount);
//             r.on("participantDisconnected", updateCount);
//             updateCount();
//         } catch (error) {
//             console.error("Room join error:", error);
//         }
//     };

//     // Egress start
//     const startEgress = async (roomName) => {
//         setEgressStarting(true);
//         try {
//             console.log("Starting egress recording...");
//             const res = await fetch(`${API_BASE}/egress/start`, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                     roomName: roomName
//                 }),
//             });

//             const j = await res.json();

//             if (j.ok) {
//                 setEgressId(j.egressId);
//                 egressIdRef.current = j.egressId;

//                 setIsStreaming(true);

//                 if (questions.length > 0) {
//                     setShowQuestions(true);
//                     setQIndex(0);
//                 } else {
//                     setShowQuestions(false);
//                 }

//                 const start = Date.now();
//                 setStreamStartTime(start);
//                 setCurrentAnswerStartTime(start);

//                 lastVoiceTimeRef.current = start;
//                 lastTranscriptRef.current = "";
//                 setShowMicWarning(false);

//                 resetTranscript();
//                 setQuestionLogs([]);

//                 // Start speech recognition immediately for theory questions
//                 try {
//                     await SpeechRecognition.startListening({
//                         continuous: true,
//                         language: "en-IN",
//                     });
//                 } catch (e) {
//                     console.error("Speech recognition start error:", e);
//                 }

//                 setTimeout(() => {
//                     const plan = getCurrentPlan();
//                     console.log(`Interview started with ${plan.name} Plan`);
//                     console.log(`Each slot: ${plan.minutes} minutes`);

//                     alert(`🎯 Interview Started!
// Plan: ${plan.name}
// Each slot: ${plan.minutes} minutes
// Interview will continue with unlimited slots until you click STOP.`);
//                 }, 1000);

//             } else {
//                 console.error("Egress start failed:", j);
//             }
//         } catch (error) {
//             console.error("Egress start error:", error);
//         } finally {
//             setEgressStarting(false);

//             if (!questionsLoading && questions.length > 0) {
//                 setShowQuestions(true);
//                 setQIndex(0);
//             }
//         }
//     };

//     // UPDATED: nextQuestion function with Redux integration
//     const nextQuestion = async () => {
//         if (isLoadingNext || isTTSPlaying || isReading) return;
//         setIsLoadingNext(true);

//         const resetState = () => {
//             const newStart = Date.now();
//             setCurrentAnswerStartTime(newStart);
//             setCode("");
//             setOutput("");
//             setShowOutput(false);
//             resetTranscript();
//             lastVoiceTimeRef.current = newStart;
//             lastTranscriptRef.current = "";
//             setShowMicWarning(false);
//             setIsLoadingNext(false);
//             resetQuestionRead();
//         };

//         try {
//             const endTime = Date.now();
//             const currentQ = getCurrentQuestion();

//             if (!currentQ) {
//                 console.error("No current question found!");
//                 setIsLoadingNext(false);
//                 return;
//             }

//             // Get current answer
//             const currentAnswer = currentQ.type === "theory" ? transcript.trim() : code;

//             // 1. Save to Redux with proper indexing
//             if (currentAnswer.trim() !== "") {
//                 if (!isInFollowUp) {
//                     // Save as parent question (index 0)
//                     console.log(`💾 Saving Parent Q${qIndex + 1} (Index 0)`);

//                     dispatch(
//                         addParentQuestion({
//                             questionIndex: qIndex,
//                             question: currentQ.text,
//                             answer: currentAnswer,
//                             quesType: currentQ.type === "programming" ? "coding" : "theory",
//                             language: selectedLanguage,
//                         })
//                     );
//                 } else {
//                     // Save as follow-up (index = currentFollowUpIndex + 1)
//                     console.log(`💾 Saving Follow-up ${currentFollowUpIndex + 1} of Q${qIndex + 1}`);

//                     dispatch(
//                         addFollowUpQuestion({
//                             questionIndex: qIndex,
//                             followUpIndex: currentFollowUpIndex,
//                             question: currentQ.text,
//                             answer: currentAnswer,
//                             quesType: currentQ.type === "programming" ? "coding" : "theory",
//                             language: selectedLanguage,
//                         })
//                     );
//                 }
//             }

//             // 2. Also save to followupResponse for AI API
//             if (currentAnswer.trim() !== "") {
//                 dispatch(
//                     addToFollowupResponse({
//                         question: currentQ.text,
//                         candiAnswer: currentAnswer,
//                         quesType: currentQ.type === "programming" ? "coding" : "theory",
//                         language: selectedLanguage,
//                         followUpIndex: isInFollowUp ? currentFollowUpIndex : 0,
//                     })
//                 );
//             }

//             // 3. Log locally
//             if (currentQ.type === "theory") {
//                 logQnA(
//                     currentQ.text,
//                     currentAnswer,
//                     currentAnswerStartTime,
//                     endTime,
//                     isInFollowUp,
//                     currentFollowUpIndex,
//                     currentQ.isAIGenerated || false
//                 );
//             } else if (currentQ.type === "programming") {
//                 logQnA(
//                     currentQ.text,
//                     currentAnswer,
//                     currentAnswerStartTime,
//                     endTime,
//                     isInFollowUp,
//                     currentFollowUpIndex,
//                     currentQ.isAIGenerated || false
//                 );
//             }

//             // 4. Check for AI follow-up
//             const shouldGenerateAI = currentAnswer.trim() !== "";
//             const currentAICount = followUpQuestions.filter(q => q.isAIGenerated).length;
//             const maxAIFollowUps = 2;

//             if (shouldGenerateAI && currentAICount < maxAIFollowUps) {
//                 try {
//                     console.log("📤 Calling AI for follow-up...");
//                     console.log("Payload followupResponse:", JSON.stringify(followupResponse, null, 2));

//                     const aiResponse = await fetch(`http://localhost:5000/api/interview/generate-followup`, {
//                         method: "POST",
//                         headers: { "Content-Type": "application/json" },
//                         body: JSON.stringify({
//                             interviewId: "692d501e3b7bfc5ced30bf12",
//                             questionId: currentQ._id,
//                             questionText: currentQ.text,
//                             answer: currentAnswer,
//                             questionType: currentQ.type === "programming" ? "coding" : "theory",
//                             language: selectedLanguage,
//                             followUpIndex: isInFollowUp ? currentFollowUpIndex : 0,
//                             followupResponse: followupResponse
//                         })
//                     });

//                     if (aiResponse.ok) {
//                         const result = await aiResponse.json();
//                         console.log("🤖 AI Response:", result);

//                         if (result.ok && result.followUpQuestion) {
//                             console.log("✅ AI Generated Follow-up:", result.followUpQuestion.question);

//                             const aiFollowUp = {
//                                 _id: `ai-${Date.now()}`,
//                                 text: result.followUpQuestion.question,
//                                 type: result.followUpQuestion.quesType === "coding" ? "programming" : "theory",
//                                 language: selectedLanguage,
//                                 isAIGenerated: true,
//                                 duration: result.followUpQuestion.duration || 180
//                             };

//                             if (!isInFollowUp) {
//                                 console.log("🔄 Starting AI follow-up mode");
//                                 setFollowUpQuestions([aiFollowUp]);
//                                 setIsInFollowUp(true);
//                                 setCurrentFollowUpIndex(0);
//                                 resetState();
//                                 return;
//                             } else if (currentFollowUpIndex >= followUpQuestions.length - 1) {
//                                 console.log("➕ Adding AI follow-up to existing follow-ups");
//                                 setFollowUpQuestions(prev => [...prev, aiFollowUp]);
//                                 resetState();
//                                 return;
//                             }
//                         }
//                     }
//                 } catch (error) {
//                     console.error("AI follow-up failed:", error);
//                 }
//             }

//             // 5. Check for DB follow-ups
//             if (!isInFollowUp) {
//                 const mainQuestion = questions[qIndex];

//                 if (mainQuestion?.follow_up_questions && mainQuestion.follow_up_questions.length > 0) {
//                     console.log(`📋 Question ${qIndex + 1} has ${mainQuestion.follow_up_questions.length} DB follow-up(s)`);

//                     // Clear followupResponse for new parent question
//                     dispatch(clearFollowupResponse());
//                     dispatch(setCurrentParentQuestion(qIndex));

//                     const transformedFollowUps = mainQuestion.follow_up_questions.map(fq => ({
//                         _id: fq._id,
//                         text: fq.follow_up_question || fq.question,
//                         type: fq.question_type === "coding" ? "programming" : "theory",
//                         language: fq.programming_language?.toLowerCase() || "javascript",
//                         isAIGenerated: false
//                     }));

//                     setFollowUpQuestions(transformedFollowUps);
//                     setIsInFollowUp(true);
//                     setCurrentFollowUpIndex(0);
//                     resetState();
//                     return;
//                 }
//             }

//             // 6. Handle existing follow-ups
//             if (isInFollowUp) {
//                 if (currentFollowUpIndex < followUpQuestions.length - 1) {
//                     setCurrentFollowUpIndex(prev => prev + 1);
//                     resetState();
//                     return;
//                 } else {
//                     // All follow-ups completed
//                     console.log(`✅ All follow-ups completed for Q${qIndex + 1}`);

//                     dispatch(logParentCompletion({
//                         questionIndex: qIndex,
//                         questionText: questions[qIndex]?.text,
//                         followUpCount: followUpQuestions.length
//                     }));

//                     // Clear for next parent question
//                     dispatch(clearFollowupResponse());

//                     setIsInFollowUp(false);
//                     setFollowUpQuestions([]);
//                     setCurrentFollowUpIndex(0);
//                 }
//             }

//             // 7. Move to next main question or finish
//             if (qIndex < questions.length - 1) {
//                 // Set new parent question
//                 dispatch(setCurrentParentQuestion(qIndex + 1));
//                 dispatch(clearFollowupResponse());
//                 setQIndex(prev => prev + 1);
//                 resetState();
//             } else {
//                 // All questions completed
//                 console.log("🎉 All questions completed - Last question saved");

//                 // Save the final state
//                 dispatch(logParentCompletion({
//                     questionIndex: qIndex,
//                     questionText: questions[qIndex]?.text,
//                     followUpCount: followUpQuestions.length
//                 }));

//                 setShowQuestions(false);
//                 SpeechRecognition.stopListening();
//                 setShowMicWarning(false);
//                 setIsLoadingNext(false);
//             }

//         } catch (error) {
//             console.error("Error in nextQuestion:", error);
//             setIsLoadingNext(false);
//         } finally {
//             if (isLoadingNext) {
//                 setTimeout(() => setIsLoadingNext(false), 1000);
//             }
//         }
//     };

//     const stopEgress = async () => {
//         await stopEverything("Live Stopped Successfully!", true);
//     };

//     // Use updated audio detection that accounts for TTS
//     const { isMuted } = useAudioDetection(listening, isTTSPlaying || isReading);

//     // Reset mic warning on new transcript with voice input
//     useEffect(() => {
//         if (!isStreaming || !showQuestions || isTTSPlaying || isReading) return;

//         if (!lastVoiceTimeRef.current) {
//             lastVoiceTimeRef.current = Date.now();
//         }

//         if (transcript !== lastTranscriptRef.current && transcript.trim().length > 0) {
//             lastTranscriptRef.current = transcript;
//             lastVoiceTimeRef.current = Date.now();
//             setShowMicWarning(false);
//         }
//     }, [transcript, isStreaming, showQuestions, isTTSPlaying, isReading]);

//     // Silence timer (10s no voice) - Only for theory questions when not listening to TTS
//     useEffect(() => {
//         if (!isStreaming || !showQuestions || isTTSPlaying || isReading) {
//             setShowMicWarning(false);
//             return;
//         }

//         const id = setInterval(() => {
//             if (!lastVoiceTimeRef.current) return;

//             const diff = Date.now() - lastVoiceTimeRef.current;
//             const currentType = getCurrentQuestionType();

//             // Only show warning for theory questions after 10 seconds of silence
//             // AND only when not listening to TTS
//             if (currentType === "theory" && diff >= 10000 && !isTTSPlaying && !isReading) {
//                 setShowMicWarning(true);
//             }
//         }, 1000);

//         return () => clearInterval(id);
//     }, [isStreaming, showQuestions, isTTSPlaying, isReading]);

//     // Set initial parent question when questions load
//     useEffect(() => {
//         if (showQuestions && questions.length > 0) {
//             dispatch(setCurrentParentQuestion(qIndex));
//         }
//     }, [showQuestions, qIndex, dispatch]);

//     // Determine if we should show mic warning
//     const shouldShowMicWarning = showMicWarning && 
//                                  isStreaming && 
//                                  showQuestions && 
//                                  questions.length > 0 && 
//                                  getCurrentQuestionType() === "theory" &&
//                                  !isTTSPlaying && 
//                                  !isReading;

//     return (
//         <Box className="interview-container">

//             {/* Camera Warning Modal */}
//             <CameraWarning
//                 open={showCameraWarning}
//                 onClose={() => setShowCameraWarning(false)}
//             />

//             {(egressStarting || (isStreaming && questionsLoading)) && (
//                 <Box
//                     sx={{
//                         position: "fixed",
//                         inset: 0,
//                         zIndex: 2000,
//                         display: "flex",
//                         flexDirection: "column",
//                         alignItems: "center",
//                         justifyContent: "center",
//                         background: "rgba(0,0,0,0.85)"
//                     }}
//                 >
//                     <Box
//                         sx={{
//                             width: "200px",
//                             height: "200px",
//                             display: "flex",
//                             alignItems: "center",
//                             justifyContent: "center"
//                         }}
//                     >
//                         <Lottie
//                             animationData={require("@/public/lottie/loading.json")}
//                             loop={true}
//                             autoplay={true}
//                             style={{ width: "100%", height: "100%" }}
//                         />
//                     </Box>

//                     <Typography
//                         sx={{
//                             mt: 2,
//                             fontSize: 18,
//                             fontWeight: 500,
//                             color: "#fff",
//                             textAlign: "center"
//                         }}
//                     >
//                         {egressStarting && "Preparing your interview..."}
//                         {!egressStarting && !questionsLoading && "Preparing your interview..."}
//                     </Typography>

//                 </Box>
//             )}

//             {/* Main Card */}
//             <Box className="interview-card">

//                 {/* Header */}
//                 <Box className="interview-header">

//                     <Box className="role-section">
//                         <img src="/images/briefcase.png" alt="role icon" className="role-icon" />
//                         <Typography className="role-text">
//                             {jobTitle || "Job Title"}
//                         </Typography>
//                     </Box>

//                     <Box className="timer-section">
//                         <img src="/images/interview.png" alt="timer label" className="timer-image" />
//                         <Typography className="timer-value">
//                             {formatTime(timeLeft)}
//                         </Typography>
//                         <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ml: 1 }}>
//                             <Typography className="plan-info" sx={{ fontSize: '12px', color: '#666' }}>
//                                 {getCurrentPlan().name}
//                             </Typography>
//                             <Typography className="slot-info" sx={{ fontSize: '10px', color: '#999' }}>
//                                 Slot {currentSlot}
//                             </Typography>
//                         </Box>
//                     </Box>

//                     {/* Next / Stop Button - DISABLED only while TTS is playing */}
//                     <Box className="next-question-section">
//                         {isLoadingNext ? (
//                             <Button className="next-question-btn" disabled>
//                                 <CircularProgress size={20} sx={{ color: '#fff', mr: 1 }} />
//                                 <span className="next-text">Loading...</span>
//                             </Button>
//                         ) : isTTSPlaying || isReading ? (
//                             <Button className="next-question-btn" disabled>
//                                 <CircularProgress size={20} sx={{ color: '#fff', mr: 1 }} />
//                                 <span className="next-text">Question is being read...</span>
//                             </Button>
//                         ) : isInFollowUp ? (
//                             currentFollowUpIndex < followUpQuestions.length - 1 ? (
//                                 <Button 
//                                     className="next-question-btn" 
//                                     onClick={nextQuestion}
//                                 >
//                                     <span className="next-text">Next Follow-up</span>
//                                     <img src="/images/nextq.png" alt="arrow" className="next-arrow" />
//                                 </Button>
//                             ) : (
//                                 <Button 
//                                     className="next-question-btn" 
//                                     onClick={nextQuestion}
//                                 >
//                                     <span className="next-text">Finish Follow-ups</span>
//                                     <img src="/images/nextq.png" alt="arrow" className="next-arrow" />
//                                 </Button>
//                             )
//                         ) : questions.length > 0 && qIndex < questions.length - 1 ? (
//                             <Button 
//                                 className="next-question-btn" 
//                                 onClick={nextQuestion}
//                             >
//                                 <span className="next-text">Next question</span>
//                                 <img src="/images/nextq.png" alt="arrow" className="next-arrow" />
//                             </Button>
//                         ) : (
//                             <Button className="stop-btn-final" onClick={stopEgress}>
//                                 Stop
//                             </Button>
//                         )}
//                     </Box>

//                 </Box>

//                 {/* If questions not ready but showQuestions was requested */}
//                 {showQuestions && questions.length === 0 && !questionsLoading && (
//                     <Box sx={{ p: 4 }}>
//                         <Typography>Questions not available. Please try again.</Typography>
//                     </Box>
//                 )}

//                 {/* Question Section - Dynamic based on type */}
//                 {showQuestions && questions.length > 0 && (
//                     <>
//                         {getCurrentQuestionType() === "theory" && (
//                             <Box className="question-section">
//                                 <Box className="q-badge">
//                                     <img src="/images/question.png" className="q-icon" alt="question icon" />
//                                     <Typography className="q-number">
//                                         {isInFollowUp ? (
//                                             <>Follow-up {currentFollowUpIndex + 1} of {followUpQuestions.length}</>
//                                         ) : (
//                                             <>Q{qIndex + 1} of {questions.length}</>
//                                         )}
//                                     </Typography>

//                                     {/* Use TTS Controls Component */}
//                                     <TTSControls
//                                         isTTSPlaying={isTTSPlaying}
//                                         isReading={isReading}
//                                         isQuestionRead={isQuestionRead}
//                                         onReadQuestion={handleReadQuestion}
//                                         disabled={false}
//                                         compact={false}
//                                         showStatus={true}
//                                     />

//                                     {isInFollowUp && followUpQuestions[currentFollowUpIndex]?.isAIGenerated && (
//                                         <Typography
//                                             sx={{
//                                                 ml: 2,
//                                                 fontSize: '12px',
//                                                 color: '#2196f3',
//                                                 background: '#e3f2fd',
//                                                 padding: '2px 8px',
//                                                 borderRadius: '4px',
//                                                 fontWeight: 'bold',
//                                                 display: 'flex',
//                                                 alignItems: 'center',
//                                                 gap: '4px'
//                                             }}
//                                         >
//                                             <span>🤖</span> AI Follow-up
//                                         </Typography>
//                                     )}

//                                     {isInFollowUp && !followUpQuestions[currentFollowUpIndex]?.isAIGenerated && (
//                                         <Typography
//                                             sx={{
//                                                 ml: 2,
//                                                 fontSize: '12px',
//                                                 color: '#666',
//                                                 background: '#f0f0f0',
//                                                 padding: '2px 8px',
//                                                 borderRadius: '4px'
//                                             }}
//                                         >
//                                             (Follow-up to Q{qIndex + 1})
//                                         </Typography>
//                                     )}
//                                 </Box>

//                                 <Box className="q-divider" />

//                                 <Typography className="question-text">
//                                     {getCurrentQuestion()?.text || "No question text"}
//                                 </Typography>
//                             </Box>
//                         )}

//                         {getCurrentQuestionType() === "programming" && (
//                             <Box className="programming-layout-container">
//                                 <Box className="left-column">
//                                     <Box className="code-editor-section">
//                                         <Box className="code-editor-header">
//                                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//                                                 <Typography className="section-title">Code Editor</Typography>
//                                                 {isInFollowUp && (
//                                                     <Typography
//                                                         sx={{
//                                                             fontSize: '12px',
//                                                             color: '#666',
//                                                             background: '#e8f5e8',
//                                                             padding: '2px 8px',
//                                                             borderRadius: '4px'
//                                                         }}
//                                                     >
//                                                         Follow-up Question
//                                                     </Typography>
//                                                 )}
//                                             </Box>
//                                             <Box className="editor-controls">
//                                                 <Box className="language-selector-section">
//                                                     <Typography className="language-label">Language:</Typography>
//                                                     <select
//                                                         value={selectedLanguage}
//                                                         onChange={(e) => setSelectedLanguage(e.target.value)}
//                                                         className="language-dropdown"
//                                                     >
//                                                         {supportedLanguages.map((lang) => (
//                                                             <option key={lang.value} value={lang.value}>
//                                                                 {lang.label}
//                                                             </option>
//                                                         ))}
//                                                     </select>
//                                                     {getCurrentQuestion()?.language && (
//                                                         <Typography className="language-note">
//                                                             (Suggested: {supportedLanguages.find(lang => lang.value === getCurrentQuestion().language)?.label || getCurrentQuestion().language})
//                                                         </Typography>
//                                                     )}
//                                                 </Box>
//                                                 <IconButton
//                                                     className="play-btn"
//                                                     onClick={runCode}
//                                                     size="small"
//                                                     title="Run Code"
//                                                     sx={{
//                                                         background: '#4caf50 !important',
//                                                         color: 'white !important',
//                                                         '&:hover': {
//                                                             background: '#45a049 !important',
//                                                             transform: 'scale(1.05) !important'
//                                                         }
//                                                     }}
//                                                 >
//                                                     <PlayArrowIcon />
//                                                 </IconButton>
//                                             </Box>
//                                         </Box>
//                                         <Box className="code-editor-container">
//                                             <CodeMirror
//                                                 value={code}
//                                                 height="100%"
//                                                 extensions={[languageConfig[selectedLanguage]?.extension || javascript()]}
//                                                 onChange={(value) => setCode(value)}
//                                                 theme="light"
//                                                 basicSetup={{
//                                                     lineNumbers: true,
//                                                     highlightActiveLine: true,
//                                                     highlightSelectionMatches: true,
//                                                     indentOnInput: true,
//                                                     syntaxHighlighting: true,
//                                                     bracketMatching: true,
//                                                     closeBrackets: true,
//                                                     autocompletion: true,
//                                                 }}
//                                             />
//                                         </Box>
//                                         <Box className="action-buttons">
//                                             <Button
//                                                 className="submit-code-btn"
//                                                 onClick={runCode}
//                                                 variant="contained"
//                                                 size="medium"
//                                             >
//                                                 Run Code
//                                             </Button>
//                                         </Box>
//                                     </Box>

//                                     {/* Output Section */}
//                                     {showOutput && (
//                                         <Box className="output-section">
//                                             <Box className="output-header">
//                                                 <Typography className="section-title">Output</Typography>
//                                                 <IconButton
//                                                     className="close-output-btn"
//                                                     onClick={() => setShowOutput(false)}
//                                                     size="small"
//                                                 >
//                                                     <CloseIcon />
//                                                 </IconButton>
//                                             </Box>
//                                             <Box className="output-container">
//                                                 <Box className="output-box">
//                                                     {output || "No output generated"}
//                                                 </Box>
//                                             </Box>
//                                         </Box>
//                                     )}
//                                 </Box>

//                                 {/* Right Column - Question and Camera */}
//                                 <Box className="right-column">
//                                     {/* Question */}
//                                     <Box className="question-tab-square">
//                                         <Box className="q-badge">
//                                             <img src="/images/question.png" className="q-icon" alt="question icon" />
//                                             <Typography className="q-number">
//                                                 {isInFollowUp ? (
//                                                     <>Follow-up {currentFollowUpIndex + 1} of {followUpQuestions.length}</>
//                                                 ) : (
//                                                     <>Question {qIndex + 1} of {questions.length}</>
//                                                 )}
//                                             </Typography>

//                                             {/* Use TTS Controls Component (Compact version) */}
//                                             <TTSControls
//                                                 isTTSPlaying={isTTSPlaying}
//                                                 isReading={isReading}
//                                                 isQuestionRead={isQuestionRead}
//                                                 onReadQuestion={handleReadQuestion}
//                                                 disabled={false}
//                                                 compact={true}
//                                                 showStatus={true}
//                                             />

//                                             {isInFollowUp && followUpQuestions[currentFollowUpIndex]?.isAIGenerated && (
//                                                 <Typography
//                                                     sx={{
//                                                         fontSize: '11px',
//                                                         color: '#2196f3',
//                                                         background: '#e3f2fd',
//                                                         padding: '2px 8px',
//                                                         borderRadius: '4px',
//                                                         marginLeft: '10px',
//                                                         fontWeight: 'bold'
//                                                     }}
//                                                 >
//                                                     🤖 AI
//                                                 </Typography>
//                                             )}
//                                         </Box>
//                                         <Box className="q-divider" />
//                                         <Typography className="question-text-square">
//                                             {getCurrentQuestion()?.text || "No question text"}
//                                         </Typography>
//                                     </Box>

//                                     {/* Camera */}
//                                     <Box className="camera-section-square">
//                                         <div ref={programmingCameraRef} className="camera-feed-square" />
//                                     </Box>
//                                 </Box>
//                             </Box>
//                         )}
//                     </>
//                 )}

//                 {/* Default Camera Section for Theory Questions */}
//                 {showQuestions && questions.length > 0 && getCurrentQuestionType() === "theory" && (
//                     <Box className="camera-section">
//                         <div ref={theoryCameraRef} className="camera-feed" />

//                         {/* Mobile Next / Submit Buttons */}
//                         <Box className="next-mobile-wrapper">
//                             {questions.length > 0 && (
//                                 isLoadingNext ? (
//                                     <button className="next-mobile-btn" disabled>
//                                         <CircularProgress size={16} sx={{ color: '#fff' }} />
//                                     </button>
//                                 ) : isTTSPlaying || isReading ? (
//                                     <button className="next-mobile-btn" disabled>
//                                         <CircularProgress size={16} sx={{ color: '#fff' }} />
//                                     </button>
//                                 ) : isInFollowUp ? (
//                                     currentFollowUpIndex < followUpQuestions.length - 1 ? (
//                                         <button 
//                                             className="next-mobile-btn" 
//                                             onClick={nextQuestion}
//                                         >
//                                             <svg className="next-mobile-arrow" viewBox="0 0 24 24" stroke="white" strokeWidth="3" fill="none">
//                                                 <path d="M8 4l8 8-8 8" />
//                                             </svg>
//                                         </button>
//                                     ) : (
//                                         <button 
//                                             className="submit-mobile-btn" 
//                                             onClick={nextQuestion}
//                                         >
//                                             Finish
//                                         </button>
//                                     )
//                                 ) : qIndex < questions.length - 1 ? (
//                                     <button 
//                                         className="next-mobile-btn" 
//                                         onClick={nextQuestion}
//                                     >
//                                         <svg className="next-mobile-arrow" viewBox="0 0 24 24" stroke="white" strokeWidth="3" fill="none">
//                                             <path d="M8 4l8 8-8 8" />
//                                         </svg>
//                                     </button>
//                                 ) : (
//                                     <button className="submit-mobile-btn" onClick={stopEgress}>
//                                         Stop
//                                     </button>
//                                 )
//                             )}
//                         </Box>
//                     </Box>
//                 )}

//             </Box>

//             {/* MIC WARNING POPUP - Only show when appropriate */}
//             <MutedModal
//                 open={shouldShowMicWarning}
//                 handleClose={() => {}} // Keep it open until user speaks
//             />

//         </Box>
//     );
// }



"use client";
import React, { useEffect, useRef, useState, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Room, LocalVideoTrack, LocalAudioTrack } from "livekit-client";
import { Box, Typography, Button, IconButton, CircularProgress } from "@mui/material";
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
import SpeechRecognition, {
    useSpeechRecognition,
} from "react-speech-recognition";
import Lottie from "lottie-react";
import "./page.css"
import CameraWarning from "../../../component/CameraWarning";
import { useCameraMonitor } from "../../../utils/CameraDetector";
import { useDispatch, useSelector } from "react-redux";
import {
    addParentQuestion,
    addFollowUpQuestion,
    addToFollowupResponse,
    clearFollowupResponse,
    setCurrentParentQuestion,
    logParentCompletion,
    clearInterviewData,
} from "../../../redux/interviewSlice.js";

import "./page.css"
import MutedModal from "../../../component/MutedModal.jsx";
import { useTTS } from "../../../utils/useTTS.js";
import TTSControls from "../../../component/TTSControls.jsx";
import useAudioDetection from "../../../utils/useAudioDetection.js";
import RunCode from "../../../utils/runCode.js";



const LIVEKIT_WS = process.env.NEXT_PUBLIC_LIVEKIT_URL;
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const EMPLOYER_PLANS = {
    growth: { name: "Growth", minutes: 2 },
    free_trial: { name: "Free Trial", minutes: 2 },
    business: { name: "Business", minutes: 2 },
    enterprise: { name: "Enterprise", minutes: 20 }
};

const determineQuestionType = (questionText) => {
    if (!questionText) return 'General';

    const q = questionText.toLowerCase();

    if (q.includes('yourself') || q.includes('about you') || q.includes('introduce')) return 'Introduction';
    if (q.includes('strength') || q.includes('weakness') || q.includes('experience')) return 'Behavioral';
    if (q.includes('design') || q.includes('system') || q.includes('architecture')) return 'Technical';
    if (q.includes('explain') || q.includes('describe') || q.includes('how would')) return 'Scenario';
    if (q.includes('code') || q.includes('program') || q.includes('write')) return 'Coding';
    if (q.includes('test') || q.includes('debug') || q.includes('error')) return 'Problem Solving';
    return 'General';
};

const transformQuestion = (questionFromAPI) => {
    let type = "theory";
    if (questionFromAPI.quesType === "coding") {
        type = "programming";
    }

    const result = {
        _id: questionFromAPI._id,
        text: questionFromAPI.question,
        type: type,
        follow_up_questions: questionFromAPI.follow_up_questions || []
    };

    if (type === "programming") {
        result.language = questionFromAPI.programming_language?.toLowerCase() || "javascript";
    }

    return result;
};

export default function LiveRoom({ params }) {
    const router = useRouter();
    const { room } = use(params);
    const search = useSearchParams();
    const name = search.get("name") || "guest";
    const planType = search.get("plan") || "enterprise";

    const dispatch = useDispatch();
    const { followupResponse } = useSelector(
        (state) => state.interview
    );

    const [isInFollowUp, setIsInFollowUp] = useState(false);
    const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState(0);
    const [followUpQuestions, setFollowUpQuestions] = useState([]);

    const [showCameraWarning, setShowCameraWarning] = useState(false);

    const { 
        isTTSPlaying, 
        isReading, 
        isQuestionRead, 
        readQuestionAloud, 
        resetQuestionRead, 
        stopTTS,
        useGoogleAPI,
        toggleGoogleAPI
    } = useTTS();
    
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition,
    } = useSpeechRecognition();
    const { isMuted, resetMuteDetection } = useAudioDetection(listening, isTTSPlaying || isReading);

    const [viewerCount, setViewer] = useState(0);
    const [lkRoom, setLkRoom] = useState(null);
    const [egressId, setEgressId] = useState(null);
    const egressIdRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const screenStreamRef = useRef(null);
    const joinedRef = useRef(false);
    const [showQuestions, setShowQuestions] = useState(false);
    const [qIndex, setQIndex] = useState(0);
    const [jobTitle, setJobTitle] = useState("");

    const [questions, setQuestions] = useState([]);
    const [questionsLoading, setQuestionsLoading] = useState(true);
    const [questionsError, setQuestionsError] = useState(null);
    const [screenShareStarting, setScreenShareStarting] = useState(false);

    const [egressStarting, setEgressStarting] = useState(false);
    const [isLoadingNext, setIsLoadingNext] = useState(false);

    const [timeLeft, setTimeLeft] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const [currentSlot, setCurrentSlot] = useState(1);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const timerRef = useRef(null);
    const alertTimeoutRef = useRef(null);

    const [showOutput, setShowOutput] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState("javascript");
    
    // State for code execution output
    const [codeOutput, setCodeOutput] = useState({
        output: "",
        stderr: "",
        stdout: ""
    });
    const [isCodeRunning, setIsCodeRunning] = useState(false);

    const languageConfig = {
        javascript: {
            extension: javascript(),
            runner: "javascript",
            initialCode: "// Write your JavaScript code here\n\nfunction example() {\n  return 'Hello, World!';\n}\n\n// Call your function or write your code below\nconsole.log(example());"
        },
        python: {
            extension: python(),
            runner: "python",
            initialCode: "# Write your Python code here\n\ndef example():\n    return 'Hello, World!'\n\n# Call your function or write your code below\nprint(example())"
        },
        java: {
            extension: java(),
            runner: "java",
            initialCode: "// Write your Java code here\n\npublic class Solution {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}"
        },
        cpp: {
            extension: cpp(),
            runner: "cpp",
            initialCode: "// Write your C++ code here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello, World!\" << endl;\n    return 0;\n}"
        },
        php: {
            extension: php(),
            runner: "php",
            initialCode: "<?php\n// Write your PHP code here\n\necho \"Hello, World!\";\n\n?>"
        },
        go: {
            extension: go(),
            runner: "go",
            initialCode: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello, World!\")\n}"
        },
        rust: {
            extension: rust(),
            runner: "rust",
            initialCode: "// Write your Rust code here\n\nfn main() {\n    println!(\"Hello, World!\");\n}"
        },
        sql: {
            extension: sql(),
            runner: "sql",
            initialCode: "-- Write your SQL queries here\n\nSELECT 'Hello, World!' AS message;"
        }
    };

    const supportedLanguages = [
        { value: "javascript", label: "JavaScript" },
        { value: "python", label: "Python" },
        { value: "java", label: "Java" },
        { value: "cpp", label: "C++" },
        { value: "php", label: "PHP" },
        { value: "go", label: "Go" },
        { value: "rust", label: "Rust" },
        { value: "sql", label: "SQL" }
    ];

    // Create a ref for the CodeMirror editor
    const codeRef = useRef(null);

    const getCurrentQuestion = () => {
        if (isInFollowUp && followUpQuestions.length > 0) {
            return followUpQuestions[currentFollowUpIndex] || null;
        }
        return questions[qIndex] || null;
    };

    const getCurrentQuestionType = () => {
        if (isInFollowUp && followUpQuestions.length > 0) {
            return followUpQuestions[currentFollowUpIndex]?.type || "theory";
        }
        return questions[qIndex]?.type || "theory";
    };

    const handleReadQuestion = async () => {
        const currentQ = getCurrentQuestion();
        if (currentQ && currentQ.text) {
            await readQuestionAloud(currentQ.text);
        }
    };

    useEffect(() => {
        const plan = EMPLOYER_PLANS[planType] || EMPLOYER_PLANS.free_trial;
        const durationInSeconds = plan.minutes * 60;
        setTotalDuration(durationInSeconds);
        setTimeLeft(durationInSeconds);

        console.log(`Timer initialized: ${plan.name} Plan - ${plan.minutes} minutes`);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (alertTimeoutRef.current) {
                clearTimeout(alertTimeoutRef.current);
            }
        };
    }, [planType]);

    useEffect(() => {
        if (isStreaming && timeLeft > 0 && !isTimeUp) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        console.log("Time up detected");
                        handleTimeUp();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isStreaming, timeLeft, isTimeUp]);

    const handleTimeUp = () => {
        if (isTimeUp) return;

        console.log("Handling time up...");
        setIsTimeUp(true);

        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        const plan = EMPLOYER_PLANS[planType] || EMPLOYER_PLANS.free_trial;

        if (alertTimeoutRef.current) {
            clearTimeout(alertTimeoutRef.current);
        }

        alertTimeoutRef.current = setTimeout(() => {
            const nextSlot = currentSlot + 1;
            console.log(`Slot ${currentSlot} completed. Starting Slot ${nextSlot}`);
            console.log(`Starting Slot ${nextSlot}: ${plan.minutes} minutes`);

            alert(`🔄 Slot ${currentSlot} completed! Starting Slot ${nextSlot}`);

            setCurrentSlot(nextSlot);
            const newDuration = plan.minutes * 60;
            setTimeLeft(newDuration);
            setIsTimeUp(false);
        }, 100);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getCurrentPlan = () => {
        return EMPLOYER_PLANS[planType] || EMPLOYER_PLANS.free_trial;
    };

    useEffect(() => {
        if (currentSlot > 1) {
            console.log(`User moved to Slot ${currentSlot}`);
        }
    }, [currentSlot]);

    useEffect(() => {
        if (showQuestions && questions.length > 0 && getCurrentQuestionType() === "programming") {
            setCode(languageConfig[selectedLanguage]?.initialCode || "");
            setCodeOutput({ output: "", stderr: "", stdout: "" });
            setShowOutput(false);
            setIsCodeRunning(false);
        }
    }, [selectedLanguage]);

    const [streamStartTime, setStreamStartTime] = useState(null);
    const [currentAnswerStartTime, setCurrentAnswerStartTime] = useState(null);
    const [questionLogs, setQuestionLogs] = useState([]);

    const forcedStopRef = useRef(false);
    const mediaTracksRef = useRef([]);

    const [showMicWarning, setShowMicWarning] = useState(false);
    const lastTranscriptRef = useRef("");

    const [code, setCode] = useState("");
    const [testResults, setTestResults] = useState([]);

    const theoryCameraRef = useRef(null);
    const programmingCameraRef = useRef(null);
    const videoTrackRef = useRef(null);

    useEffect(() => {
        if (showQuestions && questions.length > 0) {
            const currentQ = getCurrentQuestion();

            if (currentQ?.type === "programming") {
                if (currentQ.language && languageConfig[currentQ.language]) {
                    setSelectedLanguage(currentQ.language);
                } else {
                    setSelectedLanguage("javascript");
                }

                setCode(languageConfig[selectedLanguage]?.initialCode || "");
                setCodeOutput({ output: "", stderr: "", stdout: "" });
                setShowOutput(false);
                setIsCodeRunning(false);
            } else {
                resetTranscript();
            }
            
            resetQuestionRead();
        }
    }, [qIndex, isInFollowUp, currentFollowUpIndex, showQuestions]);

    useEffect(() => {
        const currentQ = getCurrentQuestion();
        if (currentQ && currentQ.text && showQuestions && isStreaming) {
            handleReadQuestion();
        }
    }, [qIndex, isInFollowUp, currentFollowUpIndex, showQuestions, isStreaming]);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                setQuestionsLoading(true);
                const response = await fetch('http://localhost:5000/api/interview/questions/692d501e3b7bfc5ced30bf12');
                const data = await response.json();

                if (data.ok && data.questions) {
                    const transformedQuestions = data.questions.map(transformQuestion);
                    setQuestions(transformedQuestions);
                    if (data.job_title) {
                        setJobTitle(data.job_title);
                    }

                    transformedQuestions.forEach((q, index) => {
                        if (q.follow_up_questions && q.follow_up_questions.length > 0) {
                            console.log(`Question ${index + 1} has ${q.follow_up_questions.length} follow-up(s)`);
                        }
                    });

                    if (isStreaming) {
                        setShowQuestions(true);
                        setQIndex(0);
                    }
                } else {
                    throw new Error('Invalid response from API');
                }
            } catch (error) {
                setQuestionsError(error.message);
            } finally {
                setQuestionsLoading(false);
            }
        };

        fetchQuestions();
    }, []);

    useEffect(() => {
        if (!questionsLoading && isStreaming && questions.length > 0 && !showQuestions) {
            setShowQuestions(true);
            setQIndex(0);
        }
    }, [questionsLoading, isStreaming, questions.length, showQuestions]);

    useEffect(() => {
        if (videoTrackRef.current && showQuestions && questions.length > 0) {
            updateCameraDisplay();
        }
    }, [qIndex, isInFollowUp, currentFollowUpIndex, showQuestions, questions.length]);

    const updateCameraDisplay = () => {
        if (!videoTrackRef.current) return;

        const currentQuestionType = getCurrentQuestionType();
        const currentCameraRef = currentQuestionType === "programming"
            ? programmingCameraRef
            : theoryCameraRef;

        const otherCameraRef = currentQuestionType === "programming"
            ? theoryCameraRef
            : programmingCameraRef;

        if (currentCameraRef.current) {
            attachToElement(videoTrackRef.current, currentCameraRef.current);
        }

        if (otherCameraRef.current) {
            clearElement(otherCameraRef.current);
        }
    };

    const handleCameraWarning = (warningCount) => {
        setShowCameraWarning(true);
    };

    const handleCameraStop = (reasonMessage, isManualStop) => {
        stopEverything(reasonMessage, isManualStop);
    };

    useCameraMonitor(isStreaming, handleCameraWarning, handleCameraStop);

    // REMOVED: The old runCode function has been replaced by the RunCode component

    const attachToElement = (track, element) => {
        if (!element) return;

        try {
            clearElement(element);

            const videoElement = track.attach();
            videoElement.muted = true;
            videoElement.playsInline = true;
            videoElement.style.width = "100%";
            videoElement.style.height = "100%";
            videoElement.style.objectFit = "cover";

            element.appendChild(videoElement);
        } catch (error) {
            console.error("Error attaching camera:", error);
        }
    };

    const clearElement = (element) => {
        if (!element) return;

        try {
            while (element.firstChild) {
                const child = element.firstChild;
                if (child.tagName === 'VIDEO') {
                    child.srcObject = null;
                }
                element.removeChild(child);
            }
        } catch (error) {
            console.error("Error clearing element:", error);
        }
    };

    const stopAllTracks = () => {
        try {
            mediaTracksRef.current.forEach(track => {
                try {
                    track.stop();
                } catch (e) { }
            });
            mediaTracksRef.current = [];

            if (videoTrackRef.current) {
                try {
                    videoTrackRef.current.stop();
                } catch (e) { }
                videoTrackRef.current = null;
            }

            if (!lkRoom || !lkRoom.localParticipant) return;

            lkRoom.localParticipant.tracks?.forEach((pub) => {
                try {
                    pub.track?.stop();
                } catch { }
            });

            lkRoom.localParticipant.videoTracks?.forEach((pub) => {
                try {
                    pub.track?.mediaStreamTrack?.stop();
                } catch { }
            });

            lkRoom.localParticipant.audioTracks?.forEach((pub) => {
                try {
                    pub.track?.mediaStreamTrack?.stop();
                } catch { }
            });

            lkRoom.localParticipant.tracks?.forEach((pub) => {
                if (pub.source === "screen_share") {
                    try {
                        pub.track?.mediaStreamTrack?.stop();
                    } catch { }
                }
            });

            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach((t) => {
                    try { t.stop(); } catch { }
                });
                screenStreamRef.current = null;
            }

        } catch (e) {
            console.error("stop error:", e);
        }
    };

    const forceStopEgress = async () => {
        const id = egressIdRef.current;
        if (!id) {
            console.warn("No egressId available, skipping egress stop");
            return;
        }

        for (let i = 0; i < 3; i++) {
            try {
                console.log("Attempting to stop egress...", i + 1);

                const res = await fetch(`${API_BASE}/egress/stop`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ egressId: id }),
                });

                const j = await res.json();
                console.log("EGRESS STOP RESPONSE:", j);

                if (j.ok) {
                    console.log("Egress stopped successfully");
                    return;
                }
            } catch (err) {
                console.error("Egress stop failed attempt:", i + 1, err);
            }

            await new Promise((r) => setTimeout(r, 300));
        }

        console.error("Failed to stop egress after 3 attempts");
    };

    const logQnA = (question, answer, startTime, endTime, isFollowUp = false, followUpIndex = null, isAIGenerated = false) => {

        const displayIndex = isFollowUp ? (followUpIndex + 1) : 0;

        const logEntry = {
            questionType: determineQuestionType(question),
            question: question,
            candAns: answer,
            startTime: startTime,
            endTime: endTime,
            slotNumber: currentSlot,
            isFollowUp: isFollowUp,
            isAIGenerated: isAIGenerated,
            displayIndex: displayIndex,
            ...(isFollowUp && {
                followUpIndex: followUpIndex,
                parentQuestionIndex: qIndex
            })
        };

        console.log('ANSWER SAVED ---', {
            index: displayIndex,
            type: isFollowUp ? 'follow-up' : 'parent',
            question: question?.substring(0, 50),
            answer: answer?.substring(0, 50),
            parent: isFollowUp ? `Q${qIndex + 1}` : null
        });

        setQuestionLogs((prev) => [...prev, logEntry]);
    };

    const stopEverything = async (
        reasonMessage = "Live stopped.",
        isManualStop = false
    ) => {
        if (forcedStopRef.current) return;
        forcedStopRef.current = true;

        console.log("Stopping everything - Saving last question...");

        stopTTS();

        try {
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(t => t.stop());
                screenStreamRef.current = null;
            }
        } catch { }

        if (showQuestions && questions.length > 0) {
            const currentQ = getCurrentQuestion();
            const endTime = Date.now();

            if (currentQ) {
                const currentAnswer = currentQ.type === "theory" ? transcript.trim() : (code || "No code submitted");

                if (currentAnswer.trim() !== "") {
                    console.log("💾 Saving last question before stopping...");

                    if (!isInFollowUp) {
                        console.log(`💾 Last question: Parent Q${qIndex + 1} (Index 0)`);
                        dispatch(
                            addParentQuestion({
                                questionIndex: qIndex,
                                question: currentQ.text,
                                answer: currentAnswer,
                                quesType: currentQ.type === "programming" ? "coding" : "theory",
                                language: selectedLanguage,
                            })
                        );
                    } else {
                        console.log(`💾 Last question: Follow-up ${currentFollowUpIndex + 1} of Q${qIndex + 1}`);
                        dispatch(
                            addFollowUpQuestion({
                                questionIndex: qIndex,
                                followUpIndex: currentFollowUpIndex,
                                question: currentQ.text,
                                answer: currentAnswer,
                                quesType: currentQ.type === "programming" ? "coding" : "theory",
                                language: selectedLanguage,
                            })
                        );
                    }

                    dispatch(
                        addToFollowupResponse({
                            question: currentQ.text,
                            candiAnswer: currentAnswer,
                            quesType: currentQ.type === "programming" ? "coding" : "theory",
                            language: selectedLanguage,
                            followUpIndex: isInFollowUp ? currentFollowUpIndex : 0,
                        })
                    );
                }

                if (currentQ.type === "theory") {
                    logQnA(
                        currentQ.text,
                        currentAnswer,
                        currentAnswerStartTime,
                        endTime,
                        isInFollowUp,
                        currentFollowUpIndex,
                        currentQ.isAIGenerated || false
                    );
                } else if (currentQ.type === "programming") {
                    logQnA(
                        currentQ.text,
                        currentAnswer,
                        currentAnswerStartTime,
                        endTime,
                        isInFollowUp,
                        currentFollowUpIndex,
                        currentQ.isAIGenerated || false
                    );
                }

                if (isInFollowUp) {
                    dispatch(logParentCompletion({
                        questionIndex: qIndex,
                        questionText: questions[qIndex]?.text,
                        followUpCount: followUpQuestions.length
                    }));
                }
            }
        } else {
            console.log("⚠️ No active question to save before stopping");
        }

        try {
            SpeechRecognition.stopListening();
        } catch (e) {
            console.error("Speech stop error:", e);
        }

        try {
            stopAllTracks();
        } catch (e) {
            console.error("Track stop error:", e);
        }

        try {
            await forceStopEgress();
        } catch (e) {
            console.error("Egress stop error:", e);
        }

        setIsStreaming(false);
        setShowMicWarning(false);
        setShowCameraWarning(false);

        window.location.href = "/stream";

        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        if (alertTimeoutRef.current) {
            clearTimeout(alertTimeoutRef.current);
        }

        await new Promise((r) => setTimeout(r, 300));

        try {
            lkRoom?.disconnect();
        } catch (e) {
            console.error("Room disconnect error:", e);
        }

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                stream.getTracks().forEach(track => track.stop());
            })
            .catch(() => { });

        console.log("========= FINAL ALL QUESTION LOGS =========");
        console.log(`Total slots used: ${currentSlot}`);
        console.log(`Total questions attempted: ${questionLogs.length}`);
        console.log(`Current question index: Q${qIndex + 1}`);
        console.log(`In follow-up mode: ${isInFollowUp}`);
        console.log(`Current follow-up index: ${currentFollowUpIndex}`);
        console.log(`Total follow-up questions: ${followUpQuestions.length}`);
        console.log("===========================================");

        const groupedByParent = {};
        questionLogs.forEach((log, index) => {
            const parentKey = log.isFollowUp ? `Q${qIndex + 1}` : `Q${index + 1}`;

            if (!groupedByParent[parentKey]) {
                groupedByParent[parentKey] = [];
            }

            groupedByParent[parentKey].push({
                index: log.isFollowUp ? log.followUpIndex : 0,
                type: log.isFollowUp ? 'follow-up' : 'parent',
                ...log
            });
        });

        Object.keys(groupedByParent).sort().forEach(parentKey => {
            console.log(`\n${parentKey}:`);
            const logs = groupedByParent[parentKey].sort((a, b) => a.index - b.index);

            logs.forEach(log => {
                const typeLabel = log.type === 'parent' ? 'PARENT' : `FOLLOW-UP ${log.index}`;
                console.log(`  [${log.index}] ${typeLabel}: ${log.question?.substring(0, 80)}...`);
                console.log(`      Answer: ${log.candAns?.substring(0, 80)}...`);
                console.log(`      Type: ${log.questionType}, AI: ${log.isAIGenerated}, Duration: ${log.endTime - log.startTime}ms`);
            });
        });

        console.log("\n===========================================");

        console.log("🎯 Triggering final Redux log before clearing...");

        await new Promise(resolve => setTimeout(resolve, 100));

        dispatch(clearInterviewData());

        console.log("📊 Final State Summary:");
        console.log(`- Questions loaded: ${questions.length}`);
        console.log(`- Questions answered: ${questionLogs.length}`);
        console.log(`- Current Q Index: ${qIndex}`);
        console.log(`- In Follow-up: ${isInFollowUp}`);
        console.log(`- Follow-up Index: ${currentFollowUpIndex}`);
        console.log(`- Follow-up Questions count: ${followUpQuestions.length}`);
        console.log(`- Transcript length: ${transcript.length}`);
        console.log(`- Code length: ${code.length}`);

        if (reasonMessage) {
            alert(reasonMessage);
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        router.push("/stream");
    };

    const handleBeforeUnload = (event) => {
        if (isStreaming) {
            event.preventDefault();
            event.returnValue = "You have an active live stream. Are you sure you want to leave?";
            return event.returnValue;
        }
    };

    const handleVisibilityChange = () => {
        if (document.hidden && isStreaming) {
            console.warn("Tab became hidden while streaming");
        }
    };

    useEffect(() => {
        if (!room || joinedRef.current) return;
        joinedRef.current = true;

        joinRoom(room);

        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            try {
                stopAllTracks();
                lkRoom?.disconnect();
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
                if (alertTimeoutRef.current) {
                    clearTimeout(alertTimeoutRef.current);
                }
            } catch { }
            SpeechRecognition.stopListening();

            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [room]);

    const startScreenShare = async (roomObj) => {
        try {
            console.log("Starting screen share...");
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always",
                    displaySurface: "monitor",
                },
                audio: false,
                selfBrowserSurface: "exclude",
                systemAudio: "exclude",
                surfaceSwitching: "exclude",
            });

            screenStreamRef.current = screenStream;
            const videoTrack = screenStream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();

            mediaTracksRef.current.push(videoTrack);

            if (settings.displaySurface !== "monitor") {
                try { videoTrack.stop(); } catch (e) { }
                alert("Please select ENTIRE SCREEN");
                setTimeout(() => startScreenShare(roomObj), 1000);
                return;
            }

            const screenTrack = new LocalVideoTrack(videoTrack);

            videoTrack.onended = () => {
                console.warn("Screen share manually stopped");
                stopEverything(
                    "Screen share was stopped. Live stream will stop.",
                    true
                );
            };

            await roomObj.localParticipant.publishTrack(screenTrack);
            console.log("Full Screen Share Published");

            await startEgress(room);
        } catch (err) {
            console.error("Screen share error:", err);
        }
    };

    const joinRoom = async (roomName) => {
        try {
            console.log("Starting room join process...");
            const tokenRes = await fetch(`${API_BASE}/token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomName: roomName,
                    identity: name
                }),
            });
            const { token } = await tokenRes.json();

            const r = new Room();
            await r.connect(LIVEKIT_WS, token);
            setLkRoom(r);

            const camStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: false,
            });

            const [vTrackRaw] = camStream.getVideoTracks();
            mediaTracksRef.current.push(vTrackRaw);

            vTrackRaw.onended = () => {
                console.warn("Camera manually turned off");
                stopEverything(
                    "Camera was turned off manually. Live stream will stop.",
                    true
                );
            };

            const vTrack = new LocalVideoTrack(vTrackRaw);
            videoTrackRef.current = vTrack;

            if (theoryCameraRef.current) {
                attachToElement(vTrack, theoryCameraRef.current);
            }

            await r.localParticipant.publishTrack(vTrack);

            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
            });
            const [micRaw] = micStream.getAudioTracks();
            mediaTracksRef.current.push(micRaw);

            micRaw.onended = () => {
                console.warn("Microphone manually turned off");
                stopEverything(
                    "Microphone was turned off manually. Live stream will stop.",
                    true
                );
            };

            const aTrack = new LocalAudioTrack(micRaw);
            await r.localParticipant.publishTrack(aTrack);

            await startScreenShare(r);

            const updateCount = () => {
                if (!r || r.state !== "connected" || !r.participants) return;
                setViewer(r.participants.size + 1);
            };

            r.on("participantConnected", updateCount);
            r.on("participantDisconnected", updateCount);
            updateCount();
        } catch (error) {
            console.error("Room join error:", error);
        }
    };

    const startEgress = async (roomName) => {
        setEgressStarting(true);
        try {
            console.log("Starting egress recording...");
            const res = await fetch(`${API_BASE}/egress/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomName: roomName
                }),
            });

            const j = await res.json();

            if (j.ok) {
                setEgressId(j.egressId);
                egressIdRef.current = j.egressId;

                setIsStreaming(true);

                if (questions.length > 0) {
                    setShowQuestions(true);
                    setQIndex(0);
                } else {
                    setShowQuestions(false);
                }

                const start = Date.now();
                setStreamStartTime(start);
                setCurrentAnswerStartTime(start);

                lastTranscriptRef.current = "";
                setShowMicWarning(false);

                resetTranscript();
                setQuestionLogs([]);

                try {
                    await SpeechRecognition.startListening({
                        continuous: true,
                        language: "en-IN",
                    });
                } catch (e) {
                    console.error("Speech recognition start error:", e);
                }

                setTimeout(() => {
                    const plan = getCurrentPlan();
                    console.log(`Interview started with ${plan.name} Plan`);
                    console.log(`Each slot: ${plan.minutes} minutes`);

                    alert(`🎯 Interview Started!
Plan: ${plan.name}
Each slot: ${plan.minutes} minutes
Interview will continue with unlimited slots until you click STOP.`);
                }, 1000);

            } else {
                console.error("Egress start failed:", j);
            }
        } catch (error) {
            console.error("Egress start error:", error);
        } finally {
            setEgressStarting(false);

            if (!questionsLoading && questions.length > 0) {
                setShowQuestions(true);
                setQIndex(0);
            }
        }
    };

    const nextQuestion = async () => {
        if (isLoadingNext || isTTSPlaying || isReading) return;
        setIsLoadingNext(true);

        const resetState = () => {
            const newStart = Date.now();
            setCurrentAnswerStartTime(newStart);
            setCode("");
            setCodeOutput({ output: "", stderr: "", stdout: "" });
            setShowOutput(false);
            setIsCodeRunning(false);
            resetTranscript();
            lastTranscriptRef.current = "";
            setShowMicWarning(false);
            setIsLoadingNext(false);
            resetQuestionRead();
        };

        try {
            const endTime = Date.now();
            const currentQ = getCurrentQuestion();

            if (!currentQ) {
                console.error("No current question found!");
                setIsLoadingNext(false);
                return;
            }

            const currentAnswer = currentQ.type === "theory" ? transcript.trim() : code;

            if (currentAnswer.trim() !== "") {
                if (!isInFollowUp) {
                    console.log(`💾 Saving Parent Q${qIndex + 1} (Index 0)`);

                    dispatch(
                        addParentQuestion({
                            questionIndex: qIndex,
                            question: currentQ.text,
                            answer: currentAnswer,
                            quesType: currentQ.type === "programming" ? "coding" : "theory",
                            language: selectedLanguage,
                        })
                    );
                } else {
                    console.log(`💾 Saving Follow-up ${currentFollowUpIndex + 1} of Q${qIndex + 1}`);

                    dispatch(
                        addFollowUpQuestion({
                            questionIndex: qIndex,
                            followUpIndex: currentFollowUpIndex,
                            question: currentQ.text,
                            answer: currentAnswer,
                            quesType: currentQ.type === "programming" ? "coding" : "theory",
                            language: selectedLanguage,
                        })
                    );
                }
            }

            if (currentAnswer.trim() !== "") {
                dispatch(
                    addToFollowupResponse({
                        question: currentQ.text,
                        candiAnswer: currentAnswer,
                        quesType: currentQ.type === "programming" ? "coding" : "theory",
                        language: selectedLanguage,
                        followUpIndex: isInFollowUp ? currentFollowUpIndex : 0,
                    })
                );
            }

            if (currentQ.type === "theory") {
                logQnA(
                    currentQ.text,
                    currentAnswer,
                    currentAnswerStartTime,
                    endTime,
                    isInFollowUp,
                    currentFollowUpIndex,
                    currentQ.isAIGenerated || false
                );
            } else if (currentQ.type === "programming") {
                logQnA(
                    currentQ.text,
                    currentAnswer,
                    currentAnswerStartTime,
                    endTime,
                    isInFollowUp,
                    currentFollowUpIndex,
                    currentQ.isAIGenerated || false
                );
            }

            const shouldGenerateAI = currentAnswer.trim() !== "";
            const currentAICount = followUpQuestions.filter(q => q.isAIGenerated).length;
            const maxAIFollowUps = 2;

            if (shouldGenerateAI && currentAICount < maxAIFollowUps) {
                try {
                    console.log("📤 Calling AI for follow-up...");
                    console.log("Payload followupResponse:", JSON.stringify(followupResponse, null, 2));

                    const aiResponse = await fetch(`http://localhost:5000/api/interview/generate-followup`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            interviewId: "692d501e3b7bfc5ced30bf12",
                            questionId: currentQ._id,
                            questionText: currentQ.text,
                            answer: currentAnswer,
                            questionType: currentQ.type === "programming" ? "coding" : "theory",
                            language: selectedLanguage,
                            followUpIndex: isInFollowUp ? currentFollowUpIndex : 0,
                            followupResponse: followupResponse
                        })
                    });

                    if (aiResponse.ok) {
                        const result = await aiResponse.json();
                        console.log("🤖 AI Response:", result);

                        if (result.ok && result.followUpQuestion) {
                            console.log("✅ AI Generated Follow-up:", result.followUpQuestion.question);

                            const aiFollowUp = {
                                _id: `ai-${Date.now()}`,
                                text: result.followUpQuestion.question,
                                type: result.followUpQuestion.quesType === "coding" ? "programming" : "theory",
                                language: selectedLanguage,
                                isAIGenerated: true,
                                duration: result.followUpQuestion.duration || 180
                            };

                            if (!isInFollowUp) {
                                console.log("🔄 Starting AI follow-up mode");
                                setFollowUpQuestions([aiFollowUp]);
                                setIsInFollowUp(true);
                                setCurrentFollowUpIndex(0);
                                resetState();
                                return;
                            } else if (currentFollowUpIndex >= followUpQuestions.length - 1) {
                                console.log("➕ Adding AI follow-up to existing follow-ups");
                                setFollowUpQuestions(prev => [...prev, aiFollowUp]);
                                resetState();
                                return;
                            }
                        }
                    }
                } catch (error) {
                    console.error("AI follow-up failed:", error);
                }
            }

            if (!isInFollowUp) {
                const mainQuestion = questions[qIndex];

                if (mainQuestion?.follow_up_questions && mainQuestion.follow_up_questions.length > 0) {
                    console.log(`📋 Question ${qIndex + 1} has ${mainQuestion.follow_up_questions.length} DB follow-up(s)`);

                    dispatch(clearFollowupResponse());
                    dispatch(setCurrentParentQuestion(qIndex));

                    const transformedFollowUps = mainQuestion.follow_up_questions.map(fq => ({
                        _id: fq._id,
                        text: fq.follow_up_question || fq.question,
                        type: fq.question_type === "coding" ? "programming" : "theory",
                        language: fq.programming_language?.toLowerCase() || "javascript",
                        isAIGenerated: false
                    }));

                    setFollowUpQuestions(transformedFollowUps);
                    setIsInFollowUp(true);
                    setCurrentFollowUpIndex(0);
                    resetState();
                    return;
                }
            }

            if (isInFollowUp) {
                if (currentFollowUpIndex < followUpQuestions.length - 1) {
                    setCurrentFollowUpIndex(prev => prev + 1);
                    resetState();
                    return;
                } else {
                    console.log(`✅ All follow-ups completed for Q${qIndex + 1}`);

                    dispatch(logParentCompletion({
                        questionIndex: qIndex,
                        questionText: questions[qIndex]?.text,
                        followUpCount: followUpQuestions.length
                    }));

                    dispatch(clearFollowupResponse());

                    setIsInFollowUp(false);
                    setFollowUpQuestions([]);
                    setCurrentFollowUpIndex(0);
                }
            }

            if (qIndex < questions.length - 1) {
                dispatch(setCurrentParentQuestion(qIndex + 1));
                dispatch(clearFollowupResponse());
                setQIndex(prev => prev + 1);
                resetState();
            } else {
                console.log("🎉 All questions completed - Last question saved");

                dispatch(logParentCompletion({
                    questionIndex: qIndex,
                    questionText: questions[qIndex]?.text,
                    followUpCount: followUpQuestions.length
                }));

                setShowQuestions(false);
                SpeechRecognition.stopListening();
                setShowMicWarning(false);
                setIsLoadingNext(false);
            }

        } catch (error) {
            console.error("Error in nextQuestion:", error);
            setIsLoadingNext(false);
        } finally {
            if (isLoadingNext) {
                setTimeout(() => setIsLoadingNext(false), 1000);
            }
        }
    };

    const stopEgress = async () => {
        await stopEverything("Live Stopped Successfully!", true);
    };

    // Reset mute detection when user speaks
    useEffect(() => {
        if (transcript !== lastTranscriptRef.current && transcript.trim().length > 0) {
            resetMuteDetection();
            lastTranscriptRef.current = transcript;
        }
    }, [transcript, resetMuteDetection]);

    useEffect(() => {
        if (showQuestions && questions.length > 0) {
            dispatch(setCurrentParentQuestion(qIndex));
        }
    }, [showQuestions, qIndex, dispatch]);

    // Condition for showing muted warning
    const shouldShowMicWarning = isMuted && 
                                 isStreaming && 
                                 showQuestions && 
                                 questions.length > 0 && 
                                 getCurrentQuestionType() === "theory" &&
                                 !isTTSPlaying && 
                                 !isReading &&
                                 listening;

return (
    <Box className="interview-container">

        <CameraWarning
            open={showCameraWarning}
            onClose={() => setShowCameraWarning(false)}
        />

        {(egressStarting || (isStreaming && questionsLoading)) && (
            <Box
                sx={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 2000,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.85)"
                }}
            >
                <Box
                    sx={{
                        width: "200px",
                        height: "200px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    <Lottie
                        animationData={require("@/public/lottie/loading.json")}
                        loop={true}
                        autoplay={true}
                        style={{ width: "100%", height: "100%" }}
                    />
                </Box>

                <Typography
                    sx={{
                        mt: 2,
                        fontSize: 18,
                        fontWeight: 500,
                        color: "#fff",
                        textAlign: "center"
                    }}
                >
                    {egressStarting && "Preparing your interview..."}
                    {!egressStarting && !questionsLoading && "Preparing your interview..."}
                </Typography>

            </Box>
        )}

        <Box className="interview-card">

            <Box className="interview-header">

                <Box className="role-section">
                    <img src="/images/briefcase.png" alt="role icon" className="role-icon" />
                    <Typography className="role-text">
                        {jobTitle || "Job Title"}
                    </Typography>
                </Box>

                <Box className="timer-section">
                    <img src="/images/interview.png" alt="timer label" className="timer-image" />
                    <Typography className="timer-value">
                        {formatTime(timeLeft)}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ml: 1 }}>
                        <Typography className="plan-info" sx={{ fontSize: '12px', color: '#666' }}>
                            {getCurrentPlan().name}
                        </Typography>
                        <Typography className="slot-info" sx={{ fontSize: '10px', color: '#999' }}>
                            Slot {currentSlot}
                        </Typography>
                    </Box>
                </Box>

                <Box className="next-question-section">
                    {isLoadingNext ? (
                        <Button className="next-question-btn" disabled>
                            <CircularProgress size={20} sx={{ color: '#fff', mr: 1 }} />
                            <span className="next-text">Loading...</span>
                        </Button>
                    ) : isTTSPlaying || isReading ? (
                        <Button className="next-question-btn" disabled>
                            <CircularProgress size={20} sx={{ color: '#fff', mr: 1 }} />
                            <span className="next-text">Question is being read...</span>
                        </Button>
                    ) : isInFollowUp ? (
                        currentFollowUpIndex < followUpQuestions.length - 1 ? (
                            <Button 
                                className="next-question-btn" 
                                onClick={nextQuestion}
                            >
                                <span className="next-text">Next Follow-up</span>
                                <img src="/images/nextq.png" alt="arrow" className="next-arrow" />
                            </Button>
                        ) : (
                            <Button 
                                className="next-question-btn" 
                                onClick={nextQuestion}
                            >
                                <span className="next-text">Finish Follow-ups</span>
                                <img src="/images/nextq.png" alt="arrow" className="next-arrow" />
                            </Button>
                        )
                    ) : questions.length > 0 && qIndex < questions.length - 1 ? (
                        <Button 
                            className="next-question-btn" 
                            onClick={nextQuestion}
                        >
                            <span className="next-text">Next question</span>
                            <img src="/images/nextq.png" alt="arrow" className="next-arrow" />
                        </Button>
                    ) : (
                        <Button className="stop-btn-final" onClick={stopEgress}>
                            Stop
                        </Button>
                    )}
                </Box>

            </Box>

            {showQuestions && questions.length === 0 && !questionsLoading && (
                <Box sx={{ p: 4 }}>
                    <Typography>Questions not available. Please try again.</Typography>
                </Box>
            )}

            {showQuestions && questions.length > 0 && (
                <>
                    {getCurrentQuestionType() === "theory" && (
                        <Box className="question-section">
                            <Box className="q-badge">
                                <img src="/images/question.png" className="q-icon" alt="question icon" />
                                <Typography className="q-number">
                                    {isInFollowUp ? (
                                        <>Follow-up {currentFollowUpIndex + 1} of {followUpQuestions.length}</>
                                    ) : (
                                        <>Q{qIndex + 1} of {questions.length}</>
                                    )}
                                </Typography>

                                <TTSControls
                                    isTTSPlaying={isTTSPlaying}
                                    isReading={isReading}
                                    isQuestionRead={isQuestionRead}
                                    onReadQuestion={handleReadQuestion}
                                    useGoogleAPI={useGoogleAPI}
                                    onToggleAPI={toggleGoogleAPI}
                                    disabled={false}
                                    compact={false}
                                    showStatus={true}
                                />

                                {isInFollowUp && followUpQuestions[currentFollowUpIndex]?.isAIGenerated && (
                                    <Typography
                                        sx={{
                                            ml: 2,
                                            fontSize: '12px',
                                            color: '#2196f3',
                                            background: '#e3f2fd',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <span>🤖</span> AI Follow-up
                                    </Typography>
                                )}

                                {isInFollowUp && !followUpQuestions[currentFollowUpIndex]?.isAIGenerated && (
                                    <Typography
                                        sx={{
                                            ml: 2,
                                            fontSize: '12px',
                                            color: '#666',
                                            background: '#f0f0f0',
                                            padding: '2px 8px',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        (Follow-up to Q{qIndex + 1})
                                    </Typography>
                                )}
                            </Box>

                            <Box className="q-divider" />

                            <Typography className="question-text">
                                {getCurrentQuestion()?.text || "No question text"}
                            </Typography>
                        </Box>
                    )}

                    {getCurrentQuestionType() === "programming" && (
                        <Box className="programming-layout-container">
                            <Box className="left-column">
                                <Box className="code-editor-section">
                                    <Box className="code-editor-header">
                                        {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> */}
                                            {/* ONLY ONE RUN CODE BUTTON HERE */}
                                            
                                            
                                            {isInFollowUp && (
                                                <Typography
                                                    sx={{
                                                        fontSize: '12px',
                                                        color: '#666',
                                                        background: '#e8f5e8',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px'
                                                    }}
                                                >
                                                    Follow-up Question
                                                </Typography>
                                            )}
                                        {/* </Box> */}
                                        <Box className="editor-controls">
                                            <Box className="language-selector-section">
                                                <Typography className="language-label">Language:</Typography>
                                                <select
                                                    value={selectedLanguage}
                                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                                    className="language-dropdown"
                                                >
                                                    {supportedLanguages.map((lang) => (
                                                        <option key={lang.value} value={lang.value}>
                                                            {lang.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                {getCurrentQuestion()?.language && (
                                                    <Typography className="language-note">
                                                        (Suggested: {supportedLanguages.find(lang => lang.value === getCurrentQuestion().language)?.label || getCurrentQuestion().language})
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                        <RunCode
                                                language={selectedLanguage}
                                                codeRef={codeRef}
                                                setOutput={setCodeOutput}
                                                onRunComplete={() => {
                                                    // Show output section when code execution completes
                                                    setShowOutput(true);
                                                }}
                                            />
                                    </Box>
                                    <Box className="code-editor-container">
                                        <CodeMirror
                                            value={code}
                                            height="100%"
                                            extensions={[languageConfig[selectedLanguage]?.extension || javascript()]}
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
                                            ref={codeRef}
                                        />
                                    </Box>
                                    
                                    {/* REMOVE THE ENTIRE ACTION-BUTTONS SECTION - NO SECOND RUNCODE BUTTON */}
                                    {/* <Box className="action-buttons">
                                        <RunCode
                                            language={selectedLanguage}
                                            codeRef={codeRef}
                                            setload={setIsCodeRunning}
                                        />
                                    </Box> */}
                                </Box>

                                {/* Output section - initially hidden, shows when Run Code is clicked */}
                                {showOutput && (
                                    <Box className="output-section">
                                        <Box className="output-header">
                                            <Typography className="section-title">Output</Typography>
                                            <IconButton
                                                className="close-output-btn"
                                                onClick={() => {
                                                    setShowOutput(false);
                                                    // Clear output when closing
                                                    setCodeOutput({ output: "", stderr: "", stdout: "" });
                                                }}
                                                size="small"
                                            >
                                                <CloseIcon />
                                            </IconButton>
                                        </Box>
                                        <Box className="output-container">
                                            <Box className="output-box">
                                                {codeOutput.stderr ? (
                                                    <Typography sx={{ 
                                                        color: "red", 
                                                        whiteSpace: "pre-wrap",
                                                        fontFamily: "monospace",
                                                        fontSize: "14px",
                                                        padding: "8px"
                                                    }}>
                                                        {codeOutput.stderr}
                                                    </Typography>
                                                ) : codeOutput.output ? (
                                                    <Typography sx={{ 
                                                        color: "black", 
                                                        whiteSpace: "pre-wrap",
                                                        fontFamily: "monospace",
                                                        fontSize: "14px",
                                                        padding: "8px"
                                                    }}>
                                                        {codeOutput.output}
                                                    </Typography>
                                                ) : (
                                                    <Typography sx={{ 
                                                        color: "gray",
                                                        fontStyle: "italic",
                                                        padding: "8px"
                                                    }}>
                                                        Output will appear here after running your code
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>
                                )}
                            </Box>

                            <Box className="right-column">
                                <Box className="question-tab-square">
                                    <Box className="q-badge">
                                        <img src="/images/question.png" className="q-icon" alt="question icon" />
                                        <Typography className="q-number">
                                            {isInFollowUp ? (
                                                <>Follow-up {currentFollowUpIndex + 1} of {followUpQuestions.length}</>
                                            ) : (
                                                <>Question {qIndex + 1} of {questions.length}</>
                                            )}
                                        </Typography>

                                        <TTSControls
                                            isTTSPlaying={isTTSPlaying}
                                            isReading={isReading}
                                            isQuestionRead={isQuestionRead}
                                            onReadQuestion={handleReadQuestion}
                                            useGoogleAPI={useGoogleAPI}
                                            onToggleAPI={toggleGoogleAPI}
                                            disabled={false}
                                            compact={true}
                                            showStatus={true}
                                        />

                                        {isInFollowUp && followUpQuestions[currentFollowUpIndex]?.isAIGenerated && (
                                            <Typography
                                                sx={{
                                                    fontSize: '11px',
                                                    color: '#2196f3',
                                                    background: '#e3f2fd',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    marginLeft: '10px',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                🤖 AI
                                            </Typography>
                                        )}
                                    </Box>
                                    <Box className="q-divider" />
                                    <Typography className="question-text-square">
                                        {getCurrentQuestion()?.text || "No question text"}
                                    </Typography>
                                </Box>

                                <Box className="camera-section-square">
                                    <div ref={programmingCameraRef} className="camera-feed-square" />
                                </Box>
                            </Box>
                        </Box>
                    )}
                </>
            )}

            {showQuestions && questions.length > 0 && getCurrentQuestionType() === "theory" && (
                <Box className="camera-section">
                    <div ref={theoryCameraRef} className="camera-feed" />

                    <Box className="next-mobile-wrapper">
                        {questions.length > 0 && (
                            isLoadingNext ? (
                                <button className="next-mobile-btn" disabled>
                                    <CircularProgress size={16} sx={{ color: '#fff' }} />
                                </button>
                            ) : isTTSPlaying || isReading ? (
                                <button className="next-mobile-btn" disabled>
                                    <CircularProgress size={16} sx={{ color: '#fff' }} />
                                </button>
                            ) : isInFollowUp ? (
                                currentFollowUpIndex < followUpQuestions.length - 1 ? (
                                    <button 
                                        className="next-mobile-btn" 
                                        onClick={nextQuestion}
                                    >
                                        <svg className="next-mobile-arrow" viewBox="0 0 24 24" stroke="white" strokeWidth="3" fill="none">
                                            <path d="M8 4l8 8-8 8" />
                                        </svg>
                                    </button>
                                ) : (
                                    <button 
                                        className="submit-mobile-btn" 
                                        onClick={nextQuestion}
                                    >
                                        Finish
                                    </button>
                                )
                            ) : qIndex < questions.length - 1 ? (
                                <button 
                                    className="next-mobile-btn" 
                                    onClick={nextQuestion}
                                >
                                    <svg className="next-mobile-arrow" viewBox="0 0 24 24" stroke="white" strokeWidth="3" fill="none">
                                        <path d="M8 4l8 8-8 8" />
                                    </svg>
                                </button>
                            ) : (
                                <button className="submit-mobile-btn" onClick={stopEgress}>
                                    Stop
                                </button>
                            )
                        )}
                    </Box>
                </Box>
            )}

        </Box>

        <MutedModal
            open={shouldShowMicWarning}
            handleClose={() => setShowMicWarning(false)}
        />

    </Box>
);
}