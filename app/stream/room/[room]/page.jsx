

// "use client";
// import React, { useEffect, useRef, useState, use } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import { Room, LocalVideoTrack, LocalAudioTrack } from "livekit-client";
// import { Box, Typography, Paper, TextField, Button, IconButton, Alert, Snackbar, CircularProgress } from "@mui/material";
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
// import { useDispatch, useSelector } from "react-redux";
// import {
//     addParentQuestion,
//     addFollowUpQuestion,
//     addToFollowupResponse,
//     clearFollowupResponse,
//     setCurrentParentQuestion,
//     logParentCompletion,
//     saveLastQuestion,
//     clearInterviewData,
// } from "../../../redux/interviewSlice.js";

// import CameraWarning from "../../../components/CameraWarning.jsx";
// import { useCameraMonitor } from "../../../utils/CameraDetector";
// import MutedModal from "../../../components/MutedModal.jsx";
// import { useTTS } from "../../../utils/useTTS.jsx";
// import TTSControls from "../../../components/TTSControls.jsx";
// import useAudioDetection from "../../../utils/useAudioDetection";
// import RunCode from "../../../utils/runCode.jsx";
// import useTabSwitchGuard from "../../../utils/useTabSwitchGuard.jsx";


// import "./page.css"

// const LIVEKIT_WS = process.env.NEXT_PUBLIC_LIVEKIT_URL;
// const API_BASE = process.env.NEXT_PUBLIC_API_URL;
// const ENABLE_TAB_GUARD = false;

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

//     const interviewId = search.get("interviewId") || "";
//     const cid = search.get("cid") || "";

//     // Redux
//     const dispatch = useDispatch();
//     const { followupResponse, currentParentQuestion, isFollowUpMode } = useSelector(
//         (state) => state.interview
//     );

//     // Follow-up states
//     const [isInFollowUp, setIsInFollowUp] = useState(false);
//     const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState(0);
//     const [followUpQuestions, setFollowUpQuestions] = useState([]);
//     const [showCameraWarning, setShowCameraWarning] = useState(false);
//     const {

//         isTTSPlaying,
//         isReading,
//         isQuestionRead,
//         readQuestionAloud,
//         resetQuestionRead,
//         stopTTS,
//         useGoogleAPI,
//         toggleGoogleAPI
//     } = useTTS();
//     const isTTSBusy = isTTSPlaying || isReading;


//     const {
//         transcript,
//         listening,
//         resetTranscript,
//         browserSupportsSpeechRecognition,
//     } = useSpeechRecognition();

//     const { isMuted, resetMuteDetection } = useAudioDetection(listening, isTTSPlaying || isReading);


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

//     const [codeOutput, setCodeOutput] = useState({
//         output: "",
//         stderr: "",
//         stdout: ""
//     });

//     const [isCodeRunning, setIsCodeRunning] = useState(false);

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

//     const codeRef = useRef(null);

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

//     // Timer countdown
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
//             setCodeOutput({ output: "", stderr: "", stdout: "" });
//             setShowOutput(false);
//             setIsCodeRunning(false);


//         }
//     }, [selectedLanguage]);


//     // timestamps
//     const [streamStartTime, setStreamStartTime] = useState(null);
//     const [currentAnswerStartTime, setCurrentAnswerStartTime] = useState(null);
//     const [questionLogs, setQuestionLogs] = useState([]);

//     const forcedStopRef = useRef(false);
//     const mediaTracksRef = useRef([]);

//     // mic silence detect
//     const [showMicWarning, setShowMicWarning] = useState(false);
//     const lastVoiceTimeRef = useRef(null);
//     const lastTranscriptRef = useRef("");

//     // Programming question states
//     const [code, setCode] = useState("");
//     const [testResults, setTestResults] = useState([]);

//     // Camera refs
//     const theoryCameraRef = useRef(null);
//     const programmingCameraRef = useRef(null);
//     const programmingCameraMobileRef = useRef(null);
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
//                 setCodeOutput({ output: "", stderr: "", stdout: "" });
//                 setShowOutput(false);
//                 setIsCodeRunning(false);
//             } else {
//                 resetTranscript();
//             }
//             resetQuestionRead();
//         }
//     }, [qIndex, isInFollowUp, currentFollowUpIndex, showQuestions]);

//     useEffect(() => {
//         const currentQ = getCurrentQuestion();
//         if (currentQ && currentQ.text && showQuestions && isStreaming) {
//             handleReadQuestion();
//         }
//     }, [qIndex, isInFollowUp, currentFollowUpIndex, showQuestions, isStreaming]);

//     // Fetch questions from backend
//     useEffect(() => {
//         const fetchQuestions = async () => {
//             try {
//                 setQuestionsLoading(true);

//                 // Check if we have interviewId
//                 if (!interviewId) {
//                     throw new Error('No interview ID provided');
//                 }

//                 // Use dynamic interviewId instead of hardcoded
//                 const response = await fetch(`http://localhost:5000/api/interview/questions/${interviewId}`);
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

//         if (currentQuestionType === "programming") {
//             // 1. Attach to Desktop Programming Camera
//             if (programmingCameraRef.current) {
//                 attachToElement(videoTrackRef.current, programmingCameraRef.current);
//             }
//             // 2. Attach to Mobile Programming Camera
//             if (programmingCameraMobileRef.current) {
//                 attachToElement(videoTrackRef.current, programmingCameraMobileRef.current);
//             }
//             // 3. Clear Theory Camera
//             if (theoryCameraRef.current) {
//                 clearElement(theoryCameraRef.current);
//             }
//         } else {
//             // THEORY MODE
//             if (theoryCameraRef.current) {
//                 attachToElement(videoTrackRef.current, theoryCameraRef.current);
//             }
//             // Clear both programming cameras
//             if (programmingCameraRef.current) {
//                 clearElement(programmingCameraRef.current);
//             }
//             if (programmingCameraMobileRef.current) {
//                 clearElement(programmingCameraMobileRef.current);
//             }
//         }
//     };

//     const handleCameraWarning = (warningCount) => {

//         setShowCameraWarning(true);

//     };

//     // kavi 
//     const handleCameraStop = (reasonMessage, isManualStop) => {
//         stopEverything(reasonMessage, isManualStop);
//     };
//     useCameraMonitor(isStreaming, handleCameraWarning, handleCameraStop);

//     // FIX 1: Robust logic to determine if we are at the ABSOLUTE end
//     const isAbsoluteLastQuestion =
//         qIndex === questions.length - 1 && // Last parent question
//         isInFollowUp && // In follow-up mode
//         (
//             // If it's AI, we MUST wait for index 2 (the 3rd question)
//             (followUpQuestions[currentFollowUpIndex]?.isAIGenerated === true && currentFollowUpIndex >= 2)
//             ||
//             // If it's DB (not AI), we rely on array length
//             (followUpQuestions[currentFollowUpIndex]?.isAIGenerated !== true && currentFollowUpIndex === followUpQuestions.length - 1)
//         );

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

//     // FIX 2: Ensure the very last answer is saved to Redux and Logs before clearing
//     const stopEverything = async (
//         reasonMessage = "Live stopped.",
//         isManualStop = false
//     ) => {
//         if (forcedStopRef.current) return;
//         forcedStopRef.current = true;

//         console.log("Stopping everything - Saving last question...");
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

//                 // FORCE SAVE - Even if empty, though usually we want content
//                 console.log("💾 Saving last question before stopping...", currentQ.text);

//                 // Save to Redux with proper indexing
//                 if (!isInFollowUp) {
//                     // Save as parent question (index 0)
//                     console.log(`💾 Last question: Parent Q${qIndex + 1} (Index 0)`);
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
//                     console.log(`💾 Last question: Follow-up ${currentFollowUpIndex + 1} of Q${qIndex + 1}`);
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

//                 // Also save to followupResponse for completeness
//                 dispatch(
//                     addToFollowupResponse({
//                         question: currentQ.text,
//                         candiAnswer: currentAnswer,
//                         quesType: currentQ.type === "programming" ? "coding" : "theory",
//                         language: selectedLanguage,
//                         followUpIndex: isInFollowUp ? currentFollowUpIndex : 0,
//                     })
//                 );

//                 // 2. Log locally with proper follow-up index
//                 logQnA(
//                     currentQ.text,
//                     currentAnswer,
//                     currentAnswerStartTime,
//                     endTime,
//                     isInFollowUp,
//                     currentFollowUpIndex,
//                     currentQ.isAIGenerated || false
//                 );

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

//         // window.location.href = "/stream";

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
//             });
//         });

//         console.log("\n===========================================");

//         // 5. Show final Redux log
//         console.log("🎯 Triggering final Redux log before clearing...");

//         // Small delay to ensure all logs are captured
//         await new Promise(resolve => setTimeout(resolve, 100));

//         // Clear Redux data (this will also log the final state)
//         dispatch(clearInterviewData());

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

//                 try {
//                     await SpeechRecognition.startListening({
//                         continuous: true,
//                         language: "en-IN",
//                     });
//                 } catch (e) {
//                     console.error("Speech start error:", e);
//                 }

//                 setTimeout(() => {
//                     const plan = getCurrentPlan();
//                     console.log(`Interview started with ${plan.name} Plan`);
//                     console.log(`Each slot: ${plan.minutes} minutes`);

//                     alert(`🎯 Interview Started!
//                             Plan: ${plan.name}
//                             Each slot: ${plan.minutes} minutes
//                             Interview will continue with unlimited slots until you click STOP.`);
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

//     const nextQuestion = async () => {
//         // Check if TTS is playing BEFORE returning
//         if (isTTSPlaying || isReading) {
//             console.log("Cannot proceed while question is being read");
//             return;
//         }

//         if (isLoadingNext) return;
//         setIsLoadingNext(true);

//         const resetState = () => {
//             const newStart = Date.now();
//             setCurrentAnswerStartTime(newStart);
//             setCode("");
//             setCodeOutput({ output: "", stderr: "", stdout: "" });
//             setShowOutput(false);
//             setIsCodeRunning(false);
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

//             const currentAnswer =
//                 currentQ.type === "theory" ? transcript.trim() : code;

//             /* =========================
//             1️ SAVE ANSWER TO REDUX
//             ========================== */
//             if (currentAnswer.trim() !== "") {
//                 if (!isInFollowUp) {
//                     console.log(`💾 Saving Parent Q${qIndex + 1} (Index 0)`);

//                     dispatch(addParentQuestion({
//                         questionIndex: qIndex,
//                         question: currentQ.text,
//                         answer: currentAnswer,
//                         quesType: currentQ.type === "programming" ? "coding" : "theory",
//                         language: selectedLanguage,
//                     }));

//                     dispatch(addToFollowupResponse({
//                         question: currentQ.text,
//                         candiAnswer: currentAnswer,
//                         quesType: currentQ.type === "programming" ? "coding" : "theory",
//                         language: selectedLanguage,
//                         followUpIndex: 0,
//                     }));
//                 } else {
//                     console.log(`💾 Saving Follow-up ${currentFollowUpIndex + 1} of Q${qIndex + 1}`);

//                     dispatch(addFollowUpQuestion({
//                         questionIndex: qIndex,
//                         followUpIndex: currentFollowUpIndex,
//                         question: currentQ.text,
//                         answer: currentAnswer,
//                         quesType: currentQ.type === "programming" ? "coding" : "theory",
//                         language: selectedLanguage,
//                     }));

//                     dispatch(addToFollowupResponse({
//                         question: currentQ.text,
//                         candiAnswer: currentAnswer,
//                         quesType: currentQ.type === "programming" ? "coding" : "theory",
//                         language: selectedLanguage,
//                         followUpIndex: currentFollowUpIndex + 1,
//                     }));
//                 }
//             }

//             /* =========================
//             2 LOCAL LOGGING
//             ========================== */
//             logQnA(
//                 currentQ.text,
//                 currentAnswer,
//                 currentAnswerStartTime,
//                 endTime,
//                 isInFollowUp,
//                 currentFollowUpIndex,
//                 currentQ.isAIGenerated || false
//             );

//             /* =========================
//             3 AI FOLLOW-UP LOGIC
//             ========================== */
//             const shouldGenerateAI = currentAnswer.trim() !== "";
//             const aiFollowUpsForThisParent = followUpQuestions.filter(q => q.isAIGenerated).length;
//             const maxAIFollowUpsPerParent = 3;

//             console.log(`🤖 AI Check: AI follow-ups=${aiFollowUpsForThisParent}, max=${maxAIFollowUpsPerParent}`);
//             console.log(`Current follow-up index: ${currentFollowUpIndex}`);
//             console.log(`In follow-up mode: ${isInFollowUp}`);

//             if (shouldGenerateAI) {
//                 try {
//                     console.log("📤 Calling AI API...");

//                     let apiFollowupResponse = [];

//                     if (!isInFollowUp) {
//                         apiFollowupResponse = [{
//                             question: currentQ.text,
//                             candiAnswer: currentAnswer,
//                             quesType: currentQ.type === "programming" ? "coding" : "theory",
//                             language: selectedLanguage,
//                             followUpIndex: 0
//                         }];
//                     } else {
//                         const parentQuestion = questions[qIndex];

//                         let parentAnswerObj = followupResponse.find(i => i.followUpIndex === 0) || {
//                             question: parentQuestion?.text,
//                             candiAnswer: "",
//                             quesType: "theory",
//                             language: selectedLanguage,
//                             followUpIndex: 0
//                         };

//                         apiFollowupResponse.push(parentAnswerObj);

//                         followupResponse
//                             .filter(i => i.followUpIndex > 0)
//                             .sort((a, b) => a.followUpIndex - b.followUpIndex)
//                             .forEach(i => apiFollowupResponse.push(i));

//                         apiFollowupResponse.push({
//                             question: currentQ.text,
//                             candiAnswer: currentAnswer,
//                             quesType: currentQ.type === "programming" ? "coding" : "theory",
//                             language: selectedLanguage,
//                             followUpIndex: currentFollowUpIndex + 1
//                         });
//                     }

//                     const followUpIndexForAPI = isInFollowUp ? currentFollowUpIndex + 1 : 0;

//                     const startTime = currentAnswerStartTime; // unix ms
//                     const endTime = Date.now();

//                     const aiResponse = await fetch(
//                         `http://localhost:5000/api/interview/generate-followup`,
//                         {
//                             method: "POST",
//                             headers: { "Content-Type": "application/json" },
//                             body: JSON.stringify({
//                                 interviewId,
//                                 questionId: currentQ._id,
//                                 questionText: currentQ.text,
//                                 answer: currentAnswer,
//                                 questionType: currentQ.type === "programming" ? "coding" : "theory",
//                                 language: selectedLanguage,
//                                 timings: {
//                                     startTime,
//                                     endTime
//                                 },
//                                 followUpIndex: followUpIndexForAPI,
//                                 followupResponse: apiFollowupResponse,
//                                 employerTesting: false,
//                                 schedule_id: cid,
//                             }),
//                         }
//                     );

//                     if (aiResponse.ok) {
//                         const result = await aiResponse.json();
//                         console.log("🤖 AI Response:", result);

//                         // ✅ FINAL AI FOLLOW-UP (3)
//                         if (isInFollowUp && currentFollowUpIndex === 2) {
//                             console.log("🎯 Follow-up 3 completed");

//                             dispatch(logParentCompletion({
//                                 questionIndex: qIndex,
//                                 questionText: questions[qIndex]?.text,
//                                 followUpCount: 3
//                             }));

//                             dispatch(clearFollowupResponse());
//                             setIsInFollowUp(false);
//                             setFollowUpQuestions([]);
//                             setCurrentFollowUpIndex(0);

//                             if (qIndex < questions.length - 1) {
//                                 const nextQIndex = qIndex + 1;
//                                 setQIndex(nextQIndex);
//                                 resetState();
//                                 return;
//                             }
//                         }

//                         if (result.ok && result.followUpQuestion) {
//                             const aiFollowUp = {
//                                 _id: `ai-${Date.now()}`,
//                                 text: result.followUpQuestion.question,
//                                 type: result.followUpQuestion.quesType === "coding" ? "programming" : "theory",
//                                 language: selectedLanguage,
//                                 isAIGenerated: true,
//                                 followUpIndex: result.followUpQuestion.followUpIndex - 1
//                             };

//                             if (!isInFollowUp) {
//                                 console.log("🔄 Starting AI follow-up");
//                                 setFollowUpQuestions([aiFollowUp]);
//                                 setIsInFollowUp(true);
//                                 setCurrentFollowUpIndex(0);
//                                 resetState();
//                                 return;
//                             } else {
//                                 console.log("➕ Adding AI follow-up");

//                                 setFollowUpQuestions(prev => [...prev, aiFollowUp]);

//                                 // ✅ ✅ ✅ MAIN FIX (single click follow-up 2)
//                                 setCurrentFollowUpIndex(prev => prev + 1);

//                                 resetState();
//                                 return;
//                             }
//                         }
//                     }
//                 } catch (error) {
//                     console.error("AI API call failed:", error);
//                 }
//             }

//             /* =========================
//             4️ DB FOLLOW-UPS
//             ========================== */
//             if (!isInFollowUp && followUpQuestions.length === 0) {
//                 const mainQuestion = questions[qIndex];

//                 if (mainQuestion?.follow_up_questions?.length > 0) {
//                     console.log(`📋 Question ${qIndex + 1} has DB follow-ups`);

//                     const transformed = mainQuestion.follow_up_questions.map((fq, i) => ({
//                         _id: fq._id,
//                         text: fq.follow_up_question || fq.question,
//                         type: fq.question_type === "coding" ? "programming" : "theory",
//                         language: fq.programming_language?.toLowerCase() || "javascript",
//                         isAIGenerated: false,
//                         followUpIndex: i
//                     }));

//                     setFollowUpQuestions(transformed);
//                     setIsInFollowUp(true);
//                     setCurrentFollowUpIndex(0);
//                     resetState();
//                     return;
//                 }
//             }

//             /* =========================
//             5️ EXISTING FOLLOW-UPS
//             ========================== */
//             if (isInFollowUp) {
//                 if (currentFollowUpIndex < followUpQuestions.length - 1) {
//                     console.log(`➡️ Moving to follow-up ${currentFollowUpIndex + 2}`);
//                     setCurrentFollowUpIndex(prev => prev + 1);
//                     resetState();
//                     return;
//                 } else {
//                     console.log(`✅ All follow-ups completed`);

//                     dispatch(logParentCompletion({
//                         questionIndex: qIndex,
//                         questionText: questions[qIndex]?.text,
//                         followUpCount: followUpQuestions.length
//                     }));

//                     dispatch(clearFollowupResponse());
//                     setIsInFollowUp(false);
//                     setFollowUpQuestions([]);
//                     setCurrentFollowUpIndex(0);
//                 }
//             }

//             /* =========================
//                6️⃣ NEXT PARENT / END
//             ========================== */
//             if (qIndex < questions.length - 1) {
//                 setQIndex(prev => prev + 1);
//                 resetState();
//             } else {
//                 console.log("🎉 All questions completed");
//                 setShowQuestions(false);
//                 SpeechRecognition.stopListening();
//                 setIsLoadingNext(false);
//                 // Call stop only if explicit end reached
//                 stopEgress();
//             }

//         } catch (err) {
//             console.error("Error in nextQuestion:", err);
//             setIsLoadingNext(false);
//         }
//     };

//     const stopEgress = async () => {
//         await stopEverything("Live Stopped Successfully!", true);
//     };


//     useEffect(() => {

//         if (transcript !== lastTranscriptRef.current && transcript.trim().length > 0) {
//             resetMuteDetection();
//             lastTranscriptRef.current = transcript;
//         }

//     }, [transcript, resetMuteDetection]);

//     // silence timer
//     useEffect(() => {
//         if (!isStreaming || !showQuestions) {
//             setShowMicWarning(false);
//             return;
//         }

//         const id = setInterval(() => {
//             if (!lastVoiceTimeRef.current) return;

//             const diff = Date.now() - lastVoiceTimeRef.current;
//             const currentType = getCurrentQuestionType();

//             if (currentType === "theory" && diff >= 10000) {
//                 setShowMicWarning(true);
//             }
//         }, 1000);

//         return () => clearInterval(id);
//     }, [isStreaming, showQuestions]);

//     // Set initial parent question when questions load
//     useEffect(() => {
//         if (showQuestions && questions.length > 0) {
//             dispatch(setCurrentParentQuestion(qIndex));
//         }
//     }, [showQuestions, qIndex, dispatch]);

//     // kavi 
//     const shouldShowMicWarning = isMuted &&
//         isStreaming &&
//         showQuestions &&
//         questions.length > 0 &&
//         getCurrentQuestionType() === "theory" &&
//         !isTTSPlaying &&
//         !isReading &&
//         listening;

//     useTabSwitchGuard({
//         enabled: ENABLE_TAB_GUARD,
//         isStreaming,
//         onViolation: async () => {
//             console.warn("🚨 Tab switch detected – stopping interview");

//             await stopEverything(
//                 "⚠️ You switched tabs/windows. Interview has been stopped.",
//                 false
//             );
//         }
//     });

//     return (
//         <Box className="interview-container">

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
//                         {/* <Typography className="role-text">
//                             {jobTitle || "Job Title"}
//                         </Typography> */}
//                         <Typography className="role-text">
//                             <span className="role-main">
//                                 {jobTitle?.replace(/\s*\(.*?\)/, "")}
//                             </span>
//                             {jobTitle?.match(/\(.*?\)/) && (
//                                 <span className="role-bracket">
//                                     {jobTitle.match(/\(.*?\)/)[0]}
//                                 </span>
//                             )}
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

//                     {/* Next / Stop Button - FIX 4: Updated Logic for Desktop Button */}
//                     <Box className="next-question-section">
//                         {isLoadingNext ? (
//                             <Button
//                                 className="next-question-btn"
//                                 onClick={nextQuestion}
//                                 disabled={isTTSBusy}
//                             >

//                                 <CircularProgress size={20} sx={{ color: '#fff', mr: 1 }} />
//                                 <span className="next-text">Loading...</span>
//                             </Button>
//                         ) : !isAbsoluteLastQuestion ? (
//                             // Show NEXT as long as we are NOT at the absolute last follow-up of the last question
//                             <Button
//                                 className="next-question-btn"
//                                 onClick={nextQuestion}
//                                 disabled={isTTSBusy}
//                             >
//                                 <span className="next-text">Next question</span>
//                                 <img src="/images/nextq.png" alt="arrow" className="next-arrow" />
//                             </Button>
//                         ) : (
//                             // Only show STOP at the very end
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
//                         {getCurrentQuestionType() === "theory" ? (
//                             // THEORY QUESTION LAYOUT
//                             <>
//                                 {/* Desktop & Mobile Theory Question Card */}
//                                 <Box className="question-section">
//                                     <Box className="q-badge">
//                                         <img src="/images/question.png" className="q-icon" alt="question icon" />
//                                         <Typography className="q-number">
//                                             {isInFollowUp
//                                                 ? `Q ${qIndex + 1}.${currentFollowUpIndex + 1}`
//                                                 : `Q ${qIndex + 1}`}
//                                         </Typography>

//                                         {/* TTS Controls - Hidden on mobile for coding, shown for theory on desktop */}
//                                         <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
//                                             <TTSControls
//                                                 isTTSPlaying={isTTSPlaying}
//                                                 isReading={isReading}
//                                                 isQuestionRead={isQuestionRead}
//                                                 onReadQuestion={handleReadQuestion}
//                                                 useGoogleAPI={useGoogleAPI}
//                                                 onToggleAPI={toggleGoogleAPI}
//                                                 disabled={false}
//                                                 compact={false}
//                                                 showStatus={true}
//                                             />
//                                         </Box>

//                                         {/* AI Badge - Hidden on mobile */}
//                                         {isInFollowUp && followUpQuestions[currentFollowUpIndex]?.isAIGenerated && (
//                                             <Typography
//                                                 sx={{
//                                                     ml: 2,
//                                                     fontSize: '12px',
//                                                     color: '#2196f3',
//                                                     background: '#e3f2fd',
//                                                     padding: '2px 8px',
//                                                     borderRadius: '4px',
//                                                     fontWeight: 'bold',
//                                                     display: { xs: 'none', md: 'flex' },
//                                                     alignItems: 'center',
//                                                     gap: '4px'
//                                                 }}
//                                             >
//                                                 <span>🤖</span> AI Follow-up
//                                             </Typography>
//                                         )}

//                                         {/* Follow-up Badge - Hidden on mobile */}
//                                         {isInFollowUp && !followUpQuestions[currentFollowUpIndex]?.isAIGenerated && (
//                                             <Typography
//                                                 sx={{
//                                                     ml: 2,
//                                                     fontSize: '12px',
//                                                     color: '#666',
//                                                     background: '#f0f0f0',
//                                                     padding: '2px 8px',
//                                                     borderRadius: '4px',
//                                                     display: { xs: 'none', md: 'flex' }
//                                                 }}
//                                             >
//                                                 (Follow-up to Q{qIndex + 1})
//                                             </Typography>
//                                         )}
//                                     </Box>

//                                     <Box className="q-divider" sx={{ display: { xs: 'none', md: 'block' } }} />

//                                     <Typography className="question-text">
//                                         {getCurrentQuestion()?.text || "No question text"}
//                                     </Typography>
//                                 </Box>

//                                 {/* Camera Section for Theory - Visible on all devices */}
//                                 <Box className="camera-section" sx={{ display: { xs: 'block', md: 'block' } }}>
//                                     <div ref={theoryCameraRef} className="camera-feed" />

//                                     {/* Mobile Next Button for Theory - FIX 5: Mobile Button Logic */}
//                                     <Box className="next-mobile-wrapper" sx={{ display: { xs: 'flex', md: 'none' } }}>
//                                         {questions.length > 0 && (
//                                             isLoadingNext ? (
//                                                 <button
//                                                     className="next-mobile-btn"
//                                                     onClick={nextQuestion}
//                                                     disabled={isTTSBusy}
//                                                     style={{
//                                                         opacity: isTTSBusy ? 0.5 : 1,
//                                                         pointerEvents: isTTSBusy ? "none" : "auto"
//                                                     }}
//                                                 >
//                                                     <CircularProgress size={16} sx={{ color: '#fff' }} />
//                                                 </button>
//                                             ) : !isAbsoluteLastQuestion ? (
//                                                 <button
//                                                     className="next-mobile-btn"
//                                                     onClick={nextQuestion}
//                                                     disabled={isTTSBusy}
//                                                     style={{
//                                                         opacity: isTTSBusy ? 0.5 : 1,
//                                                         pointerEvents: isTTSBusy ? "none" : "auto"
//                                                     }}
//                                                 >
//                                                     <svg
//                                                         className="next-mobile-arrow"
//                                                         viewBox="0 0 24 24"
//                                                         fill="none"
//                                                         stroke="white"
//                                                         strokeWidth="3"
//                                                         strokeLinecap="round"
//                                                         strokeLinejoin="round"
//                                                     >
//                                                         <path d="M8 4l8 8-8 8" />
//                                                     </svg>

//                                                 </button>
//                                             ) : (
//                                                 <button className="submit-mobile-btn" onClick={stopEgress}>
//                                                     Stop
//                                                 </button>
//                                             )
//                                         )}
//                                     </Box>
//                                 </Box>
//                             </>
//                         ) : (
//                             // CODING QUESTION LAYOUT
//                             <>
//                                 {/* DESKTOP VIEW - Full programming layout */}
//                                 <Box className="programming-layout-container" sx={{ display: { xs: 'none', md: 'flex' } }}>
//                                     <Box className="left-column">
//                                         <Box className="code-editor-section">
//                                             <Box className="code-editor-header">
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
//                                                 <Box className="editor-controls">
//                                                     <Box className="language-selector-section">
//                                                         <Typography className="language-label">Language:</Typography>
//                                                         <select
//                                                             value={selectedLanguage}
//                                                             onChange={(e) => setSelectedLanguage(e.target.value)}
//                                                             className="language-dropdown"
//                                                         >
//                                                             {supportedLanguages.map((lang) => (
//                                                                 <option key={lang.value} value={lang.value}>
//                                                                     {lang.label}
//                                                                 </option>
//                                                             ))}
//                                                         </select>
//                                                         {getCurrentQuestion()?.language && (
//                                                             <Typography className="language-note">
//                                                                 (Suggested: {supportedLanguages.find(lang => lang.value === getCurrentQuestion().language)?.label || getCurrentQuestion().language})
//                                                             </Typography>
//                                                         )}
//                                                     </Box>
//                                                     <RunCode
//                                                         language={selectedLanguage}
//                                                         codeRef={codeRef}
//                                                         setOutput={setCodeOutput}
//                                                         onRunComplete={() => {
//                                                             setShowOutput(true);
//                                                         }}
//                                                     />
//                                                 </Box>
//                                             </Box>
//                                             <Box className="code-editor-container">
//                                                 <CodeMirror
//                                                     value={code}
//                                                     height="100%"
//                                                     extensions={[languageConfig[selectedLanguage]?.extension || javascript()]}
//                                                     onChange={(value) => setCode(value)}
//                                                     theme="light"
//                                                     basicSetup={{
//                                                         lineNumbers: true,
//                                                         highlightActiveLine: true,
//                                                         highlightSelectionMatches: true,
//                                                         indentOnInput: true,
//                                                         syntaxHighlighting: true,
//                                                         bracketMatching: true,
//                                                         closeBrackets: true,
//                                                         autocompletion: true,
//                                                     }}
//                                                     ref={codeRef}
//                                                 />
//                                             </Box>
//                                         </Box>

//                                         {/* Output Section */}
//                                         {showOutput && (
//                                             <Box className="output-section">
//                                                 <Box className="output-header">
//                                                     <Typography className="section-title">Output</Typography>
//                                                     <IconButton
//                                                         className="close-output-btn"
//                                                         onClick={() => setShowOutput(false)}
//                                                         size="small"
//                                                     >
//                                                         <CloseIcon />
//                                                     </IconButton>
//                                                 </Box>
//                                                 <Box className="output-container">
//                                                     <Box className="output-box">
//                                                         {codeOutput.stderr ? (
//                                                             <Typography sx={{
//                                                                 color: "red",
//                                                                 whiteSpace: "pre-wrap",
//                                                                 fontFamily: "monospace",
//                                                                 fontSize: "14px",
//                                                                 padding: "8px"
//                                                             }}>
//                                                                 {codeOutput.stderr}
//                                                             </Typography>
//                                                         ) : codeOutput.output ? (
//                                                             <Typography sx={{
//                                                                 color: "black",
//                                                                 whiteSpace: "pre-wrap",
//                                                                 fontFamily: "monospace",
//                                                                 fontSize: "14px",
//                                                                 padding: "8px"
//                                                             }}>
//                                                                 {codeOutput.output}
//                                                             </Typography>
//                                                         ) : (
//                                                             <Typography sx={{
//                                                                 color: "gray",
//                                                                 fontStyle: "italic",
//                                                                 padding: "8px"
//                                                             }}>
//                                                                 Output will appear here after running your code
//                                                             </Typography>
//                                                         )}
//                                                     </Box>
//                                                 </Box>
//                                             </Box>
//                                         )}
//                                     </Box>

//                                     {/* Right Column - Question and Camera */}
//                                     <Box className="right-column">
//                                         {/* Question */}
//                                         <Box className="question-tab-square">
//                                             <Box className="q-badge">
//                                                 <img src="/images/question.png" className="q-icon" alt="question icon" />
//                                                 <Typography className="q-number">
//                                                     {isInFollowUp
//                                                         ? `Question ${qIndex + 1}.${currentFollowUpIndex + 1}`
//                                                         : `Question ${qIndex + 1}`}
//                                                 </Typography>


//                                                 <TTSControls

//                                                     isTTSPlaying={isTTSPlaying}
//                                                     isReading={isReading}
//                                                     isQuestionRead={isQuestionRead}
//                                                     onReadQuestion={handleReadQuestion}
//                                                     useGoogleAPI={useGoogleAPI}
//                                                     onToggleAPI={toggleGoogleAPI}
//                                                     disabled={false}
//                                                     compact={true}
//                                                     showStatus={true}
//                                                 />

//                                                 {isInFollowUp && followUpQuestions[currentFollowUpIndex]?.isAIGenerated && (
//                                                     <Typography
//                                                         sx={{
//                                                             fontSize: '11px',
//                                                             color: '#2196f3',
//                                                             background: '#e3f2fd',
//                                                             padding: '2px 8px',
//                                                             borderRadius: '4px',
//                                                             marginLeft: '10px',
//                                                             fontWeight: 'bold'
//                                                         }}
//                                                     >
//                                                         🤖 AI
//                                                     </Typography>
//                                                 )}
//                                             </Box>
//                                             <Box className="q-divider" />
//                                             <Typography className="question-text-square">
//                                                 {getCurrentQuestion()?.text || "No question text"}
//                                             </Typography>
//                                         </Box>

//                                         {/* Camera */}
//                                         <Box className="camera-section-square">
//                                             <div ref={programmingCameraRef} className="camera-feed-square" />
//                                         </Box>
//                                     </Box>
//                                 </Box>

//                                 {/* MOBILE VIEW - Simplified coding layout (like theory) */}
//                                 <Box className="coding-question-mobile" sx={{ display: { xs: 'block', md: 'none' } }}>
//                                     <Box className="q-badge">
//                                         <img src="/images/question.png" className="q-icon" alt="question icon" />
//                                         <Typography className="q-number">
//                                             {isInFollowUp
//                                                 ? `Q ${qIndex + 1}.${currentFollowUpIndex + 1}`
//                                                 : `Q ${qIndex + 1}`}
//                                         </Typography>
//                                     </Box>

//                                     <Typography className="question-text">
//                                         {getCurrentQuestion()?.text || "No question text"}
//                                     </Typography>

//                                     {/* Language indicator for coding questions */}
//                                     <Box className="coding-language-indicator">
//                                         <span className="language-dot"></span>
//                                         <span>
//                                             Language: {selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)}
//                                         </span>
//                                     </Box>
//                                 </Box>

//                                 {/* Mobile Camera Section for Coding Questions */}
//                                 <Box className="coding-camera-section" sx={{ display: { xs: 'block', md: 'none' } }}>
//                                     <div ref={programmingCameraMobileRef} className="coding-camera-feed" />



//                                     {/* Mobile Next Button for Coding - FIX 6: Mobile Coding Button Logic */}
//                                     <Box className="coding-next-mobile-wrapper">
//                                         {questions.length > 0 && (
//                                             isLoadingNext ? (
//                                                 <button
//                                                     className="coding-next-mobile-btn"
//                                                     onClick={nextQuestion}
//                                                     disabled={isTTSBusy}
//                                                     style={{
//                                                         opacity: isTTSBusy ? 0.5 : 1,
//                                                         pointerEvents: isTTSBusy ? "none" : "auto"
//                                                     }}
//                                                 >
//                                                     <CircularProgress size={16} sx={{ color: '#fff' }} />
//                                                 </button>
//                                             ) : !isAbsoluteLastQuestion ? (
//                                                 <button
//                                                     className="coding-next-mobile-btn"
//                                                     onClick={nextQuestion}
//                                                     disabled={isTTSBusy}
//                                                     style={{
//                                                         opacity: isTTSBusy ? 0.5 : 1,
//                                                         pointerEvents: isTTSBusy ? "none" : "auto"
//                                                     }}
//                                                 >
//                                                     <svg
//                                                         className="next-mobile-arrow"
//                                                         viewBox="0 0 24 24"
//                                                         fill="none"
//                                                         stroke="white"
//                                                         strokeWidth="3"
//                                                         strokeLinecap="round"
//                                                         strokeLinejoin="round"
//                                                     >
//                                                         <path d="M8 4l8 8-8 8" />
//                                                     </svg>

//                                                 </button>
//                                             ) : (
//                                                 <button className="coding-submit-mobile-btn" onClick={stopEgress}>
//                                                     Stop
//                                                 </button>
//                                             )
//                                         )}
//                                     </Box>
//                                 </Box>
//                             </>
//                         )}
//                     </>
//                 )}

//             </Box>

//             <MutedModal
//                 open={shouldShowMicWarning}
//                 handleClose={() => setShowMicWarning(false)}
//             />
//         </Box>
//     );
// }


















"use client";
import React, { useEffect, useRef, useState, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Room, LocalVideoTrack, LocalAudioTrack } from "livekit-client";
import { Box, Typography, Paper, TextField, Button, IconButton, Alert, Snackbar, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { php } from "@codemirror/lang-php";
import { go } from "@codemirror/lang-go";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";

import useDeepgramSTT from "../../../utils/useDeepgramSTT"; 

import Lottie from "lottie-react";
import { useDispatch, useSelector } from "react-redux";
import {
    addParentQuestion,
    addFollowUpQuestion,
    addToFollowupResponse,
    clearFollowupResponse,
    setCurrentParentQuestion,
    logParentCompletion,
    saveLastQuestion,
    clearInterviewData,
} from "../../../redux/interviewSlice.js";

import CameraWarning from "../../../components/CameraWarning.jsx";
import { useCameraMonitor } from "../../../utils/CameraDetector";
import MutedModal from "../../../components/MutedModal.jsx";
import { useTTS } from "../../../utils/useTTS.jsx";
import TTSControls from "../../../components/TTSControls.jsx";
import useAudioDetection from "../../../utils/useAudioDetection";
import RunCode from "../../../utils/runCode.jsx";
import useTabSwitchGuard from "../../../utils/useTabSwitchGuard.jsx";

import "./page.css"

const LIVEKIT_WS = process.env.NEXT_PUBLIC_LIVEKIT_URL;
const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const ENABLE_TAB_GUARD = false;

// Employer plans configuration
const EMPLOYER_PLANS = {
    growth: { name: "Growth", minutes: 2 },
    free_trial: { name: "Free Trial", minutes: 2 },
    business: { name: "Business", minutes: 2 },
    enterprise: { name: "Enterprise", minutes: 20 }
};

// Function to determine question type
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

// Function to transform API question to app format
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

    const interviewId = search.get("interviewId") || "";
    const cid = search.get("cid") || "";
    const [isStreaming, setIsStreaming] = useState(false);

    // Redux
    const dispatch = useDispatch();
    const { followupResponse, currentParentQuestion, isFollowUpMode } = useSelector(
        (state) => state.interview
    );

    // Follow-up states
    const [isInFollowUp, setIsInFollowUp] = useState(false);
    const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState(0);
    const [followUpQuestions, setFollowUpQuestions] = useState([]);
    const [showCameraWarning, setShowCameraWarning] = useState(false);
    const micStreamRef = useRef(null); 
    
    // TTS Hook
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
    const isTTSBusy = isTTSPlaying || isReading;

    const {
        transcript,
        resetTranscript,
        listening,
    } = useDeepgramSTT(isStreaming, micStreamRef);

    const { isMuted, resetMuteDetection } = useAudioDetection(listening, isTTSPlaying || isReading);

    const [viewerCount, setViewer] = useState(0);
    const [lkRoom, setLkRoom] = useState(null);
    const [egressId, setEgressId] = useState(null);
    const egressIdRef = useRef(null);
    const screenStreamRef = useRef(null);
    const joinedRef = useRef(false);
    const [showQuestions, setShowQuestions] = useState(false);
    const [qIndex, setQIndex] = useState(0);
    const [jobTitle, setJobTitle] = useState("");

    // Questions state
    const [questions, setQuestions] = useState([]);
    const [questionsLoading, setQuestionsLoading] = useState(true);
    const [questionsError, setQuestionsError] = useState(null);
    const [screenShareStarting, setScreenShareStarting] = useState(false);

    // Egress starting flag for loader while egress API is in-flight
    const [egressStarting, setEgressStarting] = useState(false);
    const [isLoadingNext, setIsLoadingNext] = useState(false);

    // Timer states
    const [timeLeft, setTimeLeft] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const [currentSlot, setCurrentSlot] = useState(1);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const timerRef = useRef(null);
    const alertTimeoutRef = useRef(null);

    // Remove expand state, keep output visibility state
    const [showOutput, setShowOutput] = useState(false);

    const [selectedLanguage, setSelectedLanguage] = useState("javascript");

    const [codeOutput, setCodeOutput] = useState({
        output: "",
        stderr: "",
        stdout: ""
    });

    const [isCodeRunning, setIsCodeRunning] = useState(false);

    // Language configuration mapping with initial code templates
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

    // Supported languages for dropdown
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

    const codeRef = useRef(null);

    // Helper functions to get current question
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

    // Initialize timer based on plan
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

    // Timer countdown
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

    // Time up handler
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

    // Format time for display (MM:SS)
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Get current plan info
    const getCurrentPlan = () => {
        return EMPLOYER_PLANS[planType] || EMPLOYER_PLANS.free_trial;
    };

    useEffect(() => {
        if (currentSlot > 1) {
            console.log(`User moved to Slot ${currentSlot}`);
        }
    }, [currentSlot]);

    // Update code when language changes
    useEffect(() => {
        if (showQuestions && questions.length > 0 && getCurrentQuestionType() === "programming") {
            setCode(languageConfig[selectedLanguage]?.initialCode || "");
            setCodeOutput({ output: "", stderr: "", stdout: "" });
            setShowOutput(false);
            setIsCodeRunning(false);
        }
    }, [selectedLanguage]);

    // timestamps
    const [streamStartTime, setStreamStartTime] = useState(null);
    const [currentAnswerStartTime, setCurrentAnswerStartTime] = useState(null);
    const [questionLogs, setQuestionLogs] = useState([]);

    const forcedStopRef = useRef(false);
    const mediaTracksRef = useRef([]);

    // mic silence detect
    const [showMicWarning, setShowMicWarning] = useState(false);
    const lastVoiceTimeRef = useRef(null);
    const lastTranscriptRef = useRef("");

    // Programming question states
    const [code, setCode] = useState("");
    const [testResults, setTestResults] = useState([]);

    // Camera refs
    const theoryCameraRef = useRef(null);
    const programmingCameraRef = useRef(null);
    const programmingCameraMobileRef = useRef(null);
    const videoTrackRef = useRef(null);

    // Initialize question state when it changes
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

    // Fetch questions from backend
    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                setQuestionsLoading(true);
                if (!interviewId) {
                    throw new Error('No interview ID provided');
                }
                const response = await fetch(`http://localhost:5000/api/interview/questions/${interviewId}`);
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

    // Show questions when loaded and streaming
    useEffect(() => {
        if (!questionsLoading && isStreaming && questions.length > 0 && !showQuestions) {
            setShowQuestions(true);
            setQIndex(0);
        }
    }, [questionsLoading, isStreaming, questions.length, showQuestions]);

    // Update camera display when question type changes
    useEffect(() => {
        if (videoTrackRef.current && showQuestions && questions.length > 0) {
            updateCameraDisplay();
        }
    }, [qIndex, isInFollowUp, currentFollowUpIndex, showQuestions, questions.length]);

    const updateCameraDisplay = () => {
        if (!videoTrackRef.current) return;
        const currentQuestionType = getCurrentQuestionType();
        if (currentQuestionType === "programming") {
            if (programmingCameraRef.current) {
                attachToElement(videoTrackRef.current, programmingCameraRef.current);
            }
            if (programmingCameraMobileRef.current) {
                attachToElement(videoTrackRef.current, programmingCameraMobileRef.current);
            }
            if (theoryCameraRef.current) {
                clearElement(theoryCameraRef.current);
            }
        } else {
            if (theoryCameraRef.current) {
                attachToElement(videoTrackRef.current, theoryCameraRef.current);
            }
            if (programmingCameraRef.current) {
                clearElement(programmingCameraRef.current);
            }
            if (programmingCameraMobileRef.current) {
                clearElement(programmingCameraMobileRef.current);
            }
        }
    };

    const handleCameraWarning = (warningCount) => {
        setShowCameraWarning(true);
    };

    const handleCameraStop = (reasonMessage, isManualStop) => {
        stopEverything(reasonMessage, isManualStop);
    };
    useCameraMonitor(isStreaming, handleCameraWarning, handleCameraStop);

    const isAbsoluteLastQuestion =
        qIndex === questions.length - 1 && // Last parent question
        isInFollowUp && // In follow-up mode
        (
            // If it's AI, we MUST wait for index 2 (the 3rd question)
            (followUpQuestions[currentFollowUpIndex]?.isAIGenerated === true && currentFollowUpIndex >= 2)
            ||
            // If it's DB (not AI), we rely on array length
            (followUpQuestions[currentFollowUpIndex]?.isAIGenerated !== true && currentFollowUpIndex === followUpQuestions.length - 1)
        );

    // Safe DOM manipulation functions
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

    // Function to log Q&A in structured format
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

    // FIX 2: Ensure the very last answer is saved to Redux and Logs before clearing
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

    // ✅✅✅ ADDITION #1 — STOP SHARED MIC STREAM (Deepgram + LiveKit)
    try {
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => {
                try { t.stop(); } catch {}
            });
            micStreamRef.current = null;
            console.log("🎤 Shared mic stream stopped");
        }
    } catch (e) {
        console.error("Shared mic stop error:", e);
    }
    // ✅✅✅ END ADDITION #1

    // 1. FIRST: Save the current/last question to Redux and local logs
    if (showQuestions && questions.length > 0) {
        const currentQ = getCurrentQuestion();
        const endTime = Date.now();
        if (currentQ) {
            const currentAnswer =
                currentQ.type === "theory"
                    ? transcript.trim()
                    : (code || "No code submitted");

            console.log("💾 Saving last question before stopping...", currentQ.text);

            if (!isInFollowUp) {
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

            logQnA(
                currentQ.text,
                currentAnswer,
                currentAnswerStartTime,
                endTime,
                isInFollowUp,
                currentFollowUpIndex,
                currentQ.isAIGenerated || false
            );

            if (isInFollowUp) {
                dispatch(
                    logParentCompletion({
                        questionIndex: qIndex,
                        questionText: questions[qIndex]?.text,
                        followUpCount: followUpQuestions.length,
                    })
                );
            }
        }
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

    setIsStreaming(false); // closes Deepgram socket safely
    setShowMicWarning(false);
    setShowCameraWarning(false);

    if (timerRef.current) clearInterval(timerRef.current);
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);

    await new Promise(r => setTimeout(r, 300));

    try {
        lkRoom?.disconnect();
    } catch (e) {
        console.error("Room disconnect error:", e);
    }

    // ✅ KEEP (YOU ASKED NOT TO REMOVE)
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            stream.getTracks().forEach(track => track.stop());
        })
        .catch(() => { });

    console.log("========= FINAL ALL QUESTION LOGS =========");
    console.log(`Total slots used: ${currentSlot}`);
    console.log(`Total questions attempted: ${questionLogs.length}`);

    dispatch(clearInterviewData());

    if (reasonMessage) alert(reasonMessage);

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
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [room]);

    // Screen share
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
            micStreamRef.current = micStream;
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

    // Egress start
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
                lastVoiceTimeRef.current = start;
                lastTranscriptRef.current = "";
                setShowMicWarning(false);
                
                resetTranscript();
                setQuestionLogs([]);

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
        if (isTTSPlaying || isReading) {
            console.log("Cannot proceed while question is being read");
            return;
        }
        if (isLoadingNext) return;
        setIsLoadingNext(true);

        const resetState = () => {
            const newStart = Date.now();
            setCurrentAnswerStartTime(newStart);
            setCode("");
            setCodeOutput({ output: "", stderr: "", stdout: "" });
            setShowOutput(false);
            setIsCodeRunning(false);
            resetTranscript();
            lastVoiceTimeRef.current = newStart;
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

            // CHANGED: uses transcript from Deepgram
            const currentAnswer = currentQ.type === "theory" ? transcript.trim() : code;

            if (currentAnswer.trim() !== "") {
                if (!isInFollowUp) {
                    console.log(`💾 Saving Parent Q${qIndex + 1} (Index 0)`);
                    dispatch(addParentQuestion({
                        questionIndex: qIndex,
                        question: currentQ.text,
                        answer: currentAnswer,
                        quesType: currentQ.type === "programming" ? "coding" : "theory",
                        language: selectedLanguage,
                    }));
                    dispatch(addToFollowupResponse({
                        question: currentQ.text,
                        candiAnswer: currentAnswer,
                        quesType: currentQ.type === "programming" ? "coding" : "theory",
                        language: selectedLanguage,
                        followUpIndex: 0,
                    }));
                } else {
                    console.log(`💾 Saving Follow-up ${currentFollowUpIndex + 1} of Q${qIndex + 1}`);
                    dispatch(addFollowUpQuestion({
                        questionIndex: qIndex,
                        followUpIndex: currentFollowUpIndex,
                        question: currentQ.text,
                        answer: currentAnswer,
                        quesType: currentQ.type === "programming" ? "coding" : "theory",
                        language: selectedLanguage,
                    }));
                    dispatch(addToFollowupResponse({
                        question: currentQ.text,
                        candiAnswer: currentAnswer,
                        quesType: currentQ.type === "programming" ? "coding" : "theory",
                        language: selectedLanguage,
                        followUpIndex: currentFollowUpIndex + 1,
                    }));
                }
            }

            logQnA(
                currentQ.text,
                currentAnswer,
                currentAnswerStartTime,
                endTime,
                isInFollowUp,
                currentFollowUpIndex,
                currentQ.isAIGenerated || false
            );

            const shouldGenerateAI = currentAnswer.trim() !== "";
            const aiFollowUpsForThisParent = followUpQuestions.filter(q => q.isAIGenerated).length;
            const maxAIFollowUpsPerParent = 3;

            console.log(`🤖 AI Check: AI follow-ups=${aiFollowUpsForThisParent}, max=${maxAIFollowUpsPerParent}`);
            console.log(`Current follow-up index: ${currentFollowUpIndex}`);
            console.log(`In follow-up mode: ${isInFollowUp}`);

            if (shouldGenerateAI) {
                try {
                    console.log("📤 Calling AI API...");
                    let apiFollowupResponse = [];
                    if (!isInFollowUp) {
                        apiFollowupResponse = [{
                            question: currentQ.text,
                            candiAnswer: currentAnswer,
                            quesType: currentQ.type === "programming" ? "coding" : "theory",
                            language: selectedLanguage,
                            followUpIndex: 0
                        }];
                    } else {
                        const parentQuestion = questions[qIndex];
                        let parentAnswerObj = followupResponse.find(i => i.followUpIndex === 0) || {
                            question: parentQuestion?.text,
                            candiAnswer: "",
                            quesType: "theory",
                            language: selectedLanguage,
                            followUpIndex: 0
                        };
                        apiFollowupResponse.push(parentAnswerObj);
                        followupResponse
                            .filter(i => i.followUpIndex > 0)
                            .sort((a, b) => a.followUpIndex - b.followUpIndex)
                            .forEach(i => apiFollowupResponse.push(i));
                        apiFollowupResponse.push({
                            question: currentQ.text,
                            candiAnswer: currentAnswer,
                            quesType: currentQ.type === "programming" ? "coding" : "theory",
                            language: selectedLanguage,
                            followUpIndex: currentFollowUpIndex + 1
                        });
                    }

                    const followUpIndexForAPI = isInFollowUp ? currentFollowUpIndex + 1 : 0;
                    const startTime = currentAnswerStartTime;
                    const aiResponse = await fetch(
                        `http://localhost:5000/api/interview/generate-followup`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                interviewId,
                                questionId: currentQ._id,
                                questionText: currentQ.text,
                                answer: currentAnswer,
                                questionType: currentQ.type === "programming" ? "coding" : "theory",
                                language: selectedLanguage,
                                timings: {
                                    startTime,
                                    endTime
                                },
                                followUpIndex: followUpIndexForAPI,
                                followupResponse: apiFollowupResponse,
                                employerTesting: false,
                                schedule_id: cid,
                            }),
                        }
                    );

                    if (aiResponse.ok) {
                        const result = await aiResponse.json();
                        console.log("🤖 AI Response:", result);
                        if (isInFollowUp && currentFollowUpIndex === 2) {
                            console.log("🎯 Follow-up 3 completed");
                            dispatch(logParentCompletion({
                                questionIndex: qIndex,
                                questionText: questions[qIndex]?.text,
                                followUpCount: 3
                            }));
                            dispatch(clearFollowupResponse());
                            setIsInFollowUp(false);
                            setFollowUpQuestions([]);
                            setCurrentFollowUpIndex(0);
                            if (qIndex < questions.length - 1) {
                                const nextQIndex = qIndex + 1;
                                setQIndex(nextQIndex);
                                resetState();
                                return;
                            }
                        }
                        if (result.ok && result.followUpQuestion) {
                            const aiFollowUp = {
                                _id: `ai-${Date.now()}`,
                                text: result.followUpQuestion.question,
                                type: result.followUpQuestion.quesType === "coding" ? "programming" : "theory",
                                language: selectedLanguage,
                                isAIGenerated: true,
                                followUpIndex: result.followUpQuestion.followUpIndex - 1
                            };
                            if (!isInFollowUp) {
                                console.log("🔄 Starting AI follow-up");
                                setFollowUpQuestions([aiFollowUp]);
                                setIsInFollowUp(true);
                                setCurrentFollowUpIndex(0);
                                resetState();
                                return;
                            } else {
                                console.log("➕ Adding AI follow-up");
                                setFollowUpQuestions(prev => [...prev, aiFollowUp]);
                                setCurrentFollowUpIndex(prev => prev + 1);
                                resetState();
                                return;
                            }
                        }
                    }
                } catch (error) {
                    console.error("AI API call failed:", error);
                }
            }

            if (!isInFollowUp && followUpQuestions.length === 0) {
                const mainQuestion = questions[qIndex];
                if (mainQuestion?.follow_up_questions?.length > 0) {
                    console.log(`📋 Question ${qIndex + 1} has DB follow-ups`);
                    const transformed = mainQuestion.follow_up_questions.map((fq, i) => ({
                        _id: fq._id,
                        text: fq.follow_up_question || fq.question,
                        type: fq.question_type === "coding" ? "programming" : "theory",
                        language: fq.programming_language?.toLowerCase() || "javascript",
                        isAIGenerated: false,
                        followUpIndex: i
                    }));
                    setFollowUpQuestions(transformed);
                    setIsInFollowUp(true);
                    setCurrentFollowUpIndex(0);
                    resetState();
                    return;
                }
            }

            if (isInFollowUp) {
                if (currentFollowUpIndex < followUpQuestions.length - 1) {
                    console.log(`➡️ Moving to follow-up ${currentFollowUpIndex + 2}`);
                    setCurrentFollowUpIndex(prev => prev + 1);
                    resetState();
                    return;
                } else {
                    console.log(`✅ All follow-ups completed`);
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
                setQIndex(prev => prev + 1);
                resetState();
            } else {
                console.log("🎉 All questions completed");
                setShowQuestions(false);
                // --- CHANGED: REMOVED SpeechRecognition.stopListening() ---
                setIsLoadingNext(false);
                stopEgress();
            }

        } catch (err) {
            console.error("Error in nextQuestion:", err);
            setIsLoadingNext(false);
        }
    };

    const stopEgress = async () => {
        await stopEverything("Live Stopped Successfully!", true);
    };

    useEffect(() => {
        if (transcript !== lastTranscriptRef.current && transcript.trim().length > 0) {
            resetMuteDetection();
            lastTranscriptRef.current = transcript;
        }
    }, [transcript, resetMuteDetection]);

    // silence timer
    useEffect(() => {
        if (!isStreaming || !showQuestions) {
            setShowMicWarning(false);
            return;
        }
        const id = setInterval(() => {
            if (!lastVoiceTimeRef.current) return;
            const diff = Date.now() - lastVoiceTimeRef.current;
            const currentType = getCurrentQuestionType();
            if (currentType === "theory" && diff >= 10000) {
                setShowMicWarning(true);
            }
        }, 1000);
        return () => clearInterval(id);
    }, [isStreaming, showQuestions]);

    // Set initial parent question when questions load
    useEffect(() => {
        if (showQuestions && questions.length > 0) {
            dispatch(setCurrentParentQuestion(qIndex));
        }
    }, [showQuestions, qIndex, dispatch]);

    const shouldShowMicWarning = isMuted &&
        isStreaming &&
        showQuestions &&
        questions.length > 0 &&
        getCurrentQuestionType() === "theory" &&
        !isTTSPlaying &&
        !isReading &&
        listening;

    useTabSwitchGuard({
        enabled: ENABLE_TAB_GUARD,
        isStreaming,
        onViolation: async () => {
            console.warn("🚨 Tab switch detected – stopping interview");
            await stopEverything(
                "⚠️ You switched tabs/windows. Interview has been stopped.",
                false
            );
        }
    });

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

            {/* Main Card */}
            <Box className="interview-card">

                {/* Header */}
                <Box className="interview-header">

                    <Box className="role-section">
                        <img src="/images/briefcase.png" alt="role icon" className="role-icon" />
                        {/* <Typography className="role-text">
                            {jobTitle || "Job Title"}
                        </Typography> */}
                        <Typography className="role-text">
                            <span className="role-main">
                                {jobTitle?.replace(/\s*\(.*?\)/, "")}
                            </span>
                            {jobTitle?.match(/\(.*?\)/) && (
                                <span className="role-bracket">
                                    {jobTitle.match(/\(.*?\)/)[0]}
                                </span>
                            )}
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

                    {/* Next / Stop Button - FIX 4: Updated Logic for Desktop Button */}
                    <Box className="next-question-section">
                        {isLoadingNext ? (
                            <Button
                                className="next-question-btn"
                                onClick={nextQuestion}
                                disabled={isTTSBusy}
                            >

                                <CircularProgress size={20} sx={{ color: '#fff', mr: 1 }} />
                                <span className="next-text">Loading...</span>
                            </Button>
                        ) : !isAbsoluteLastQuestion ? (
                            // Show NEXT as long as we are NOT at the absolute last follow-up of the last question
                            <Button
                                className="next-question-btn"
                                onClick={nextQuestion}
                                disabled={isTTSBusy}
                            >
                                <span className="next-text">Next question</span>
                                <img src="/images/nextq.png" alt="arrow" className="next-arrow" />
                            </Button>
                        ) : (
                            // Only show STOP at the very end
                            <Button className="stop-btn-final" onClick={stopEgress}>
                                Stop
                            </Button>
                        )}
                    </Box>

                </Box>

                {/* If questions not ready but showQuestions was requested */}
                {showQuestions && questions.length === 0 && !questionsLoading && (
                    <Box sx={{ p: 4 }}>
                        <Typography>Questions not available. Please try again.</Typography>
                    </Box>
                )}

                {/* Question Section - Dynamic based on type */}
                {showQuestions && questions.length > 0 && (
                    <>
                        {getCurrentQuestionType() === "theory" ? (
                            // THEORY QUESTION LAYOUT
                            <>
                                {/* Desktop & Mobile Theory Question Card */}
                                <Box className="question-section">
                                    <Box className="q-badge">
                                        <img src="/images/question.png" className="q-icon" alt="question icon" />
                                        <Typography className="q-number">
                                            {isInFollowUp
                                                ? `Q ${qIndex + 1}.${currentFollowUpIndex + 1}`
                                                : `Q ${qIndex + 1}`}
                                        </Typography>

                                        {/* TTS Controls - Hidden on mobile for coding, shown for theory on desktop */}
                                        <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
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
                                        </Box>

                                        {/* AI Badge - Hidden on mobile */}
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
                                                    display: { xs: 'none', md: 'flex' },
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <span>🤖</span> AI Follow-up
                                            </Typography>
                                        )}

                                        {/* Follow-up Badge - Hidden on mobile */}
                                        {isInFollowUp && !followUpQuestions[currentFollowUpIndex]?.isAIGenerated && (
                                            <Typography
                                                sx={{
                                                    ml: 2,
                                                    fontSize: '12px',
                                                    color: '#666',
                                                    background: '#f0f0f0',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    display: { xs: 'none', md: 'flex' }
                                                }}
                                            >
                                                (Follow-up to Q{qIndex + 1})
                                            </Typography>
                                        )}
                                    </Box>

                                    <Box className="q-divider" sx={{ display: { xs: 'none', md: 'block' } }} />

                                    <Typography className="question-text">
                                        {getCurrentQuestion()?.text || "No question text"}
                                    </Typography>
                                </Box>

                                {/* Camera Section for Theory - Visible on all devices */}
                                <Box className="camera-section" sx={{ display: { xs: 'block', md: 'block' } }}>
                                    <div ref={theoryCameraRef} className="camera-feed" />

                                    {/* Mobile Next Button for Theory - FIX 5: Mobile Button Logic */}
                                    <Box className="next-mobile-wrapper" sx={{ display: { xs: 'flex', md: 'none' } }}>
                                        {questions.length > 0 && (
                                            isLoadingNext ? (
                                                <button
                                                    className="next-mobile-btn"
                                                    onClick={nextQuestion}
                                                    disabled={isTTSBusy}
                                                    style={{
                                                        opacity: isTTSBusy ? 0.5 : 1,
                                                        pointerEvents: isTTSBusy ? "none" : "auto"
                                                    }}
                                                >
                                                    <CircularProgress size={16} sx={{ color: '#fff' }} />
                                                </button>
                                            ) : !isAbsoluteLastQuestion ? (
                                                <button
                                                    className="next-mobile-btn"
                                                    onClick={nextQuestion}
                                                    disabled={isTTSBusy}
                                                    style={{
                                                        opacity: isTTSBusy ? 0.5 : 1,
                                                        pointerEvents: isTTSBusy ? "none" : "auto"
                                                    }}
                                                >
                                                    <svg
                                                        className="next-mobile-arrow"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="white"
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
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
                            </>
                        ) : (
                            // CODING QUESTION LAYOUT
                            <>
                                {/* DESKTOP VIEW - Full programming layout */}
                                <Box className="programming-layout-container" sx={{ display: { xs: 'none', md: 'flex' } }}>
                                    <Box className="left-column">
                                        <Box className="code-editor-section">
                                            <Box className="code-editor-header">
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
                                                    <RunCode
                                                        language={selectedLanguage}
                                                        codeRef={codeRef}
                                                        setOutput={setCodeOutput}
                                                        onRunComplete={() => {
                                                            setShowOutput(true);
                                                        }}
                                                    />
                                                </Box>
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
                                        </Box>

                                        {/* Output Section */}
                                        {showOutput && (
                                            <Box className="output-section">
                                                <Box className="output-header">
                                                    <Typography className="section-title">Output</Typography>
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

                                    {/* Right Column - Question and Camera */}
                                    <Box className="right-column">
                                        {/* Question */}
                                        <Box className="question-tab-square">
                                            <Box className="q-badge">
                                                <img src="/images/question.png" className="q-icon" alt="question icon" />
                                                <Typography className="q-number">
                                                    {isInFollowUp
                                                        ? `Question ${qIndex + 1}.${currentFollowUpIndex + 1}`
                                                        : `Question ${qIndex + 1}`}
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

                                        {/* Camera */}
                                        <Box className="camera-section-square">
                                            <div ref={programmingCameraRef} className="camera-feed-square" />
                                        </Box>
                                    </Box>
                                </Box>

                                {/* MOBILE VIEW - Simplified coding layout (like theory) */}
                                <Box className="coding-question-mobile" sx={{ display: { xs: 'block', md: 'none' } }}>
                                    <Box className="q-badge">
                                        <img src="/images/question.png" className="q-icon" alt="question icon" />
                                        <Typography className="q-number">
                                            {isInFollowUp
                                                ? `Q ${qIndex + 1}.${currentFollowUpIndex + 1}`
                                                : `Q ${qIndex + 1}`}
                                        </Typography>
                                    </Box>

                                    <Typography className="question-text">
                                        {getCurrentQuestion()?.text || "No question text"}
                                    </Typography>

                                    {/* Language indicator for coding questions */}
                                    <Box className="coding-language-indicator">
                                        <span className="language-dot"></span>
                                        <span>
                                            Language: {selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)}
                                        </span>
                                    </Box>
                                </Box>

                                {/* Mobile Camera Section for Coding Questions */}
                                <Box className="coding-camera-section" sx={{ display: { xs: 'block', md: 'none' } }}>
                                    <div ref={programmingCameraMobileRef} className="coding-camera-feed" />



                                    {/* Mobile Next Button for Coding - FIX 6: Mobile Coding Button Logic */}
                                    <Box className="coding-next-mobile-wrapper">
                                        {questions.length > 0 && (
                                            isLoadingNext ? (
                                                <button
                                                    className="coding-next-mobile-btn"
                                                    onClick={nextQuestion}
                                                    disabled={isTTSBusy}
                                                    style={{
                                                        opacity: isTTSBusy ? 0.5 : 1,
                                                        pointerEvents: isTTSBusy ? "none" : "auto"
                                                    }}
                                                >
                                                    <CircularProgress size={16} sx={{ color: '#fff' }} />
                                                </button>
                                            ) : !isAbsoluteLastQuestion ? (
                                                <button
                                                    className="coding-next-mobile-btn"
                                                    onClick={nextQuestion}
                                                    disabled={isTTSBusy}
                                                    style={{
                                                        opacity: isTTSBusy ? 0.5 : 1,
                                                        pointerEvents: isTTSBusy ? "none" : "auto"
                                                    }}
                                                >
                                                    <svg
                                                        className="next-mobile-arrow"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="white"
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M8 4l8 8-8 8" />
                                                    </svg>

                                                </button>
                                            ) : (
                                                <button className="coding-submit-mobile-btn" onClick={stopEgress}>
                                                    Stop
                                                </button>
                                            )
                                        )}
                                    </Box>
                                </Box>
                            </>
                        )}
                    </>
                )}

            </Box>

            <MutedModal
                open={shouldShowMicWarning}
                handleClose={() => setShowMicWarning(false)}
            />
        </Box>
    );
}