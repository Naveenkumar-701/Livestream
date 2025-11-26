
// "use client";
// import React, { useEffect, useRef, useState, use } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import { Room, LocalVideoTrack, LocalAudioTrack } from "livekit-client";
// import { Box, Typography, Paper, TextField, Button, IconButton } from "@mui/material";
// import VisibilityIcon from "@mui/icons-material/Visibility";
// import CloseIcon from "@mui/icons-material/Close";
// import SpeechRecognition, {
//     useSpeechRecognition,
// } from "react-speech-recognition";

// const LIVEKIT_WS = process.env.NEXT_PUBLIC_LIVEKIT_URL;
// const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// export default function LiveRoom({ params }) {
//     const router = useRouter();
//     const { room } = use(params);
//     const search = useSearchParams();
//     const name = search.get("name") || "guest";

//     const [viewerCount, setViewer] = useState(0);
//     const [chat, setChat] = useState([]);
//     const [msg, setMsg] = useState("");
//     const [lkRoom, setLkRoom] = useState(null);
//     const [egressId, setEgressId] = useState(null);
//     const egressIdRef = useRef(null);
//     const [isStreaming, setIsStreaming] = useState(false);
//     const videoRef = useRef(null);
//     const screenStreamRef = useRef(null);
//     const joinedRef = useRef(false);

//     const questions = [
//         "Tell me about yourself?",
//         "What are your strengths?",
//         "What is your biggest weakness?",
//         "Where do you see yourself in 5 years?",
//         "Why should we hire you?",
//     ];

//     const [showQuestions, setShowQuestions] = useState(false);
//     const [qIndex, setQIndex] = useState(0);
//     const [cameraHeight, setCameraHeight] = useState("80vh");

//     // 🚫 Prevent tab/window switching — alert only (count attempts)
// const tabSwitchAttempts = useRef(0);

// useEffect(() => {
//     if (!isStreaming) return;

//     const warnUser = () => {
//         tabSwitchAttempts.current += 1;

//         alert(
//             `You cannot switch tabs or windows during the interview!\n\n` +
//             `Attempt: ${tabSwitchAttempts.current}`
//         );

//         // Bring focus back
//         window.focus();
//     };

//     const handleBlur = () => {
//         warnUser();
//     };

//     const handleVisibilityChange = () => {
//         if (document.hidden && isStreaming) {
//             warnUser();
//         }
//     };

//     window.addEventListener("blur", handleBlur);
//     document.addEventListener("visibilitychange", handleVisibilityChange);

//     return () => {
//         window.removeEventListener("blur", handleBlur);
//         document.removeEventListener("visibilitychange", handleVisibilityChange);
//     };
// }, [isStreaming]);


//     // speech recognition
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

//     // avoid double stop
//     const forcedStopRef = useRef(false);
//     const mediaTracksRef = useRef([]); // Track all media tracks for cleanup

//     // 🔊 MIC SILENCE DETECTION STATE
//     const [showMicWarning, setShowMicWarning] = useState(false);
//     const lastVoiceTimeRef = useRef(null);
//     const lastTranscriptRef = useRef("");

//     const stopAllTracks = () => {
//         try {
//             // Stop all tracked media streams
//             mediaTracksRef.current.forEach(track => {
//                 try {
//                     track.stop();
//                 } catch (e) {
//                     console.warn("Error stopping track:", e);
//                 }
//             });
//             mediaTracksRef.current = [];

//             // Stop LiveKit tracks
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

//             // Stop screen share
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

//     // GUARANTEED EGRESS STOP
//     const forceStopEgress = async () => {
//         const id = egressIdRef.current;
//         if (!id) {
//             console.warn("⚠️ No egressId available, skipping egress stop");
//             return;
//         }

//         for (let i = 0; i < 3; i++) {
//             try {
//                 console.log("🛑 Attempting to stop egress...", i + 1);

//                 const res = await fetch(`${API_BASE}/egress/stop`, {
//                     method: "POST",
//                     headers: { "Content-Type": "application/json" },
//                     body: JSON.stringify({ egressId: id }),
//                 });

//                 const j = await res.json();
//                 console.log("EGRESS STOP RESPONSE:", j);

//                 if (j.ok) {
//                     console.log("✅ Egress stopped successfully");
//                     return;
//                 }
//             } catch (err) {
//                 console.error("⚠️ Egress stop failed attempt:", i + 1, err);
//             }

//             await new Promise((r) => setTimeout(r, 300));
//         }

//         console.error("❌ Failed to stop egress after 3 attempts");
//     };

//     // GLOBAL KILL FUNCTION
//     const stopEverything = async (
//         reasonMessage = "Live stopped.",
//         isManualStop = false
//     ) => {
//         if (forcedStopRef.current) return;
//         forcedStopRef.current = true;

//         console.log("🛑 Stopping everything...");

//         try {
//             if (screenStreamRef.current) {
//                 screenStreamRef.current.getTracks().forEach(t => t.stop());
//                 screenStreamRef.current = null;
//             }
//         } catch { }

//         // Save final answer if present
//         if (transcript.trim()) {
//             const endTime = Date.now();
//             const logEntry = {
//                 question: questions[qIndex],
//                 answer: transcript.trim(),
//                 startTime: currentAnswerStartTime,
//                 endTime: endTime,
//             };

//             setQuestionLogs((prev) => {
//                 const updated = [...prev, logEntry];
//                 console.log("========= FINAL LOGS =========");
//                 console.log(updated);
//                 console.log("==============================");
//                 return updated;
//             });
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

//         // Stop egress before disconnect / navigation
//         try {
//             await forceStopEgress();
//         } catch (e) {
//             console.error("Egress stop error:", e);
//         }

//         setIsStreaming(false);
//         setShowMicWarning(false); // hide popup when stopping

//         // Small delay to make sure fetch is flushed
//         await new Promise((r) => setTimeout(r, 300));

//         try {
//             lkRoom?.disconnect();
//         } catch (e) {
//             console.error("Room disconnect error:", e);
//         }

//         // Clear all media permissions and indicators
//         navigator.mediaDevices.getUserMedia({ video: true, audio: true })
//             .then(stream => {
//                 stream.getTracks().forEach(track => track.stop());
//             })
//             .catch(() => { });

//         if (reasonMessage) {
//             alert(reasonMessage);
//         }

//         router.push("/stream");
//     };

//     // Handle browser/tab closure
//     const handleBeforeUnload = (event) => {
//         if (isStreaming) {
//             event.preventDefault();
//             event.returnValue = "You have an active live stream. Are you sure you want to leave?";
//             return event.returnValue;
//         }
//     };

//     // Handle page visibility change (tab switching)
//     const handleVisibilityChange = () => {
//         if (document.hidden && isStreaming) {
//             console.warn("⚠️ Tab became hidden while streaming");
//             // You can choose to stop stream or just log
//             // stopEverything("Stream stopped because tab was hidden");
//         }
//     };

//     useEffect(() => {
//         console.log("Browser speech support?", browserSupportsSpeechRecognition);
//     }, [browserSupportsSpeechRecognition]);

//     useEffect(() => {
//         if (!room || joinedRef.current) return;
//         joinedRef.current = true;

//         joinRoom(room);

//         // Add event listeners
//         window.addEventListener("beforeunload", handleBeforeUnload);
//         document.addEventListener("visibilitychange", handleVisibilityChange);

//         return () => {
//             // Cleanup function that runs when component unmounts
//             try {
//                 stopAllTracks();
//                 lkRoom?.disconnect();
//             } catch { }
//             SpeechRecognition.stopListening();

//             // Remove event listeners
//             window.removeEventListener("beforeunload", handleBeforeUnload);
//             document.removeEventListener("visibilitychange", handleVisibilityChange);
//         };
//         // eslint-disable-next-line
//     }, [room]);

//     const startScreenShare = async (roomObj) => {
//         try {
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

//             // Track for cleanup
//             mediaTracksRef.current.push(videoTrack);

//             console.log("🖥️ Screen share settings:", settings);

//             if (settings.displaySurface !== "monitor") {
//                 videoTrack.stop();
//                 alert("Please select ENTIRE SCREEN");
//                 setTimeout(() => startScreenShare(roomObj), 1000);
//                 return;
//             }

//             const screenTrack = new LocalVideoTrack(videoTrack);

//             // Handle screen-share end
//             videoTrack.onended = () => {
//                 console.warn("⚠️ Screen share manually stopped");
//                 stopEverything(
//                     "Screen share was stopped. Live stream will stop.",
//                     true
//                 );
//             };

//             await roomObj.localParticipant.publishTrack(screenTrack);
//             console.log("🖥️ Full Screen Share Published");
//         } catch (err) {
//             console.error("❌ Screen share error:", err);
//         }
//     };

//     const joinRoom = async (roomName) => {
//         const tokenRes = await fetch(`${API_BASE}/token`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ roomName, identity: name }),
//         });
//         const { token } = await tokenRes.json();

//         const r = new Room();
//         await r.connect(LIVEKIT_WS, token);
//         setLkRoom(r);

//         // 🎥 CAMERA STREAM
//         const camStream = await navigator.mediaDevices.getUserMedia({
//             video: true,
//             audio: false,
//         });
//         const [vTrackRaw] = camStream.getVideoTracks();

//         // Track for cleanup
//         mediaTracksRef.current.push(vTrackRaw);

//         // Detect manual camera off
//         vTrackRaw.onended = () => {
//             console.warn("⚠️ Camera manually turned off");
//             stopEverything(
//                 "Camera was turned off manually. Live stream will stop.",
//                 true
//             );
//         };

//         const vTrack = new LocalVideoTrack(vTrackRaw);
//         attach(vTrack, videoRef.current);
//         await r.localParticipant.publishTrack(vTrack);

//         // 🎙️ MIC STREAM
//         const micStream = await navigator.mediaDevices.getUserMedia({
//             audio: {
//                 echoCancellation: true,
//                 noiseSuppression: true,
//             },
//         });
//         const [micRaw] = micStream.getAudioTracks();

//         // Track for cleanup
//         mediaTracksRef.current.push(micRaw);

//         // Detect manual mic off
//         micRaw.onended = () => {
//             console.warn("⚠️ Microphone manually turned off");
//             stopEverything(
//                 "Microphone was turned off manually. Live stream will stop.",
//                 true
//             );
//         };

//         const aTrack = new LocalAudioTrack(micRaw);
//         await r.localParticipant.publishTrack(aTrack);

//         await startScreenShare(r);
//         await startEgress(roomName);

//         const updateCount = () => {
//             if (!r || r.state !== "connected" || !r.participants) return;
//             setViewer(r.participants.size + 1);
//         };

//         r.on("participantConnected", updateCount);
//         r.on("participantDisconnected", updateCount);
//         updateCount();

//         r.on("dataReceived", (payload, p) => {
//             const text = new TextDecoder().decode(payload);
//             setChat((c) => [...c, { from: p.identity || "anon", text }]);
//         });
//     };

//     const attach = (track, el) => {
//         const node = track.attach();
//         node.muted = true;
//         node.playsInline = true;
//         node.style.width = "100%";
//         node.style.height = "100%";
//         node.style.objectFit = "cover";
//         el.innerHTML = "";
//         el.appendChild(node);
//     };

//     const startEgress = async (roomName) => {
//         const res = await fetch(`${API_BASE}/egress/start`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ roomName }),
//         });

//         const j = await res.json();

//         if (j.ok) {
//             setEgressId(j.egressId);
//             egressIdRef.current = j.egressId;

//             setIsStreaming(true);

//             setShowQuestions(true);
//             setQIndex(0);
//             setCameraHeight("65vh");

//             const start = Date.now();
//             setStreamStartTime(start);
//             setCurrentAnswerStartTime(start);

//             // 🔊 RESET SILENCE TIMER WHEN STREAM STARTS
//             lastVoiceTimeRef.current = start;
//             lastTranscriptRef.current = "";
//             setShowMicWarning(false);

//             resetTranscript();
//             setQuestionLogs([]);

//             try {
//                 await SpeechRecognition.startListening({
//                     continuous: true,
//                     language: "en-IN",
//                 });
//                 console.log("🎙️ Speech recognition started");
//             } catch (e) {
//                 console.error("Speech start error:", e);
//             }
//         }
//     };

//     const nextQuestion = () => {
//         const endTime = Date.now();

//         const logEntry = {
//             question: questions[qIndex],
//             answer: transcript.trim(),
//             startTime: currentAnswerStartTime,
//             endTime: endTime,
//         };

//         console.log("========== ANSWER SAVED ==========");
//         console.log(logEntry);
//         console.log("==================================");

//         setQuestionLogs((prev) => [...prev, logEntry]);
//         resetTranscript();

//         if (qIndex < questions.length - 1) {
//             const newIndex = qIndex + 1;
//             setQIndex(newIndex);
//             const newStart = Date.now();
//             setCurrentAnswerStartTime(newStart);

//             // 🔊 NEW QUESTION → RESET SILENCE TIMER
//             lastVoiceTimeRef.current = newStart;
//             lastTranscriptRef.current = "";
//             setShowMicWarning(false);
//         } else {
//             setShowQuestions(false);
//             setCameraHeight("80vh");
//             SpeechRecognition.stopListening();
//             console.log("🎙️ Speech recognition stopped");
//             setShowMicWarning(false);
//         }
//     };

//     // Stop button uses same killer
//     const stopEgress = async () => {
//         await stopEverything("Live Stopped Successfully!", true);
//     };

//     const sendMsg = () => {
//         if (!msg.trim() || !lkRoom) return;

//         const d = new TextEncoder().encode(msg.trim());
//         lkRoom.localParticipant.publishData(d, 1);

//         setChat((c) => [...c, { from: "You", text: msg }]);
//         setMsg("");
//     };

//     // 🔊 WATCH TRANSCRIPT CHANGES (USER TALKING)
//     useEffect(() => {
//         if (!isStreaming || !showQuestions) return;

//         if (!lastVoiceTimeRef.current) {
//             lastVoiceTimeRef.current = Date.now();
//         }

//         if (
//             transcript !== lastTranscriptRef.current &&
//             transcript.trim().length > 0
//         ) {
//             lastTranscriptRef.current = transcript;
//             lastVoiceTimeRef.current = Date.now();

//             if (showMicWarning) {
//                 setShowMicWarning(false);
//             }
//         }
//     }, [transcript, isStreaming, showQuestions, showMicWarning]);

//     // 🔊 SILENCE TIMER: IF NO VOICE FOR 20s SHOW POPUP
//     useEffect(() => {
//         if (!isStreaming || !showQuestions) {
//             setShowMicWarning(false);
//             return;
//         }

//         const id = setInterval(() => {
//             if (!lastVoiceTimeRef.current) return;

//             const diff = Date.now() - lastVoiceTimeRef.current;

//             if (diff >= 10000) { // 20 seconds
//                 setShowMicWarning(true);
//             }
//         }, 1000);

//         return () => clearInterval(id);
//     }, [isStreaming, showQuestions]);

//     return (
//         <Box
//             sx={{
//                 display: "flex",
//                 height: "100vh",
//                 bgcolor: "#0b0810",
//                 flexDirection: { xs: "column", md: "row" },
//             }}
//         >
//             {/* LEFT SIDE */}
//             <Box sx={{ flex: 1, p: { xs: 1.5, md: 2 } }}>
//                 <Box
//                     sx={{
//                         display: "flex",
//                         justifyContent: "space-between",
//                         alignItems: "center",
//                         mb: 1,
//                     }}
//                 >
//                     <Typography sx={{ color: "#fff", fontWeight: 700 }}>
//                         {room}
//                     </Typography>

//                     <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
//                         {isStreaming ? (
//                             <Button
//                                 variant="contained"
//                                 color="error"
//                                 onClick={stopEgress}
//                                 sx={{ bgcolor: "#ff3b3b" }}
//                             >
//                                 Stop Live
//                             </Button>
//                         ) : (
//                             <Typography sx={{ color: "#aaa" }}>
//                                 Stream stopped
//                             </Typography>
//                         )}

//                         <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
//                             <Box
//                                 sx={{
//                                     width: 10,
//                                     height: 10,
//                                     borderRadius: "50%",
//                                     bgcolor: isStreaming ? "red" : "gray",
//                                     animation: isStreaming ? "blink 1s infinite" : "none",
//                                 }}
//                             />
//                             <Typography sx={{ color: "#fff" }}>
//                                 {isStreaming ? "LIVE" : "OFF"}
//                             </Typography>
//                             <VisibilityIcon fontSize="small" sx={{ color: "#fff" }} />
//                             <Typography sx={{ color: "#fff" }}>
//                                 {viewerCount}
//                             </Typography>
//                         </Box>
//                     </Box>
//                 </Box>

//                 {/* QUESTION BAR */}
//                 {showQuestions && (
//                     <Box
//                         sx={{
//                             bgcolor: "#1e1628",
//                             color: "#fff",
//                             p: 2,
//                             mb: 1,
//                             borderRadius: 2,
//                             display: "flex",
//                             justifyContent: "space-between",
//                             alignItems: "center",
//                             fontSize: 16,
//                             fontWeight: 600,
//                         }}
//                     >
//                         <Typography>{questions[qIndex]}</Typography>

//                         <Button
//                             variant="contained"
//                             sx={{ bgcolor: "#6f5bd4" }}
//                             onClick={nextQuestion}
//                         >
//                             Next
//                         </Button>
//                     </Box>
//                 )}

//                 {/* CAMERA */}
//                 <Paper
//                     sx={{
//                         height: { xs: "45vh", md: cameraHeight },
//                         transition: "height .4s",
//                         overflow: "hidden",
//                         bgcolor: "#000",
//                     }}
//                 >
//                     <div ref={videoRef} style={{ width: "100%", height: "100%" }} />
//                 </Paper>
//             </Box>

//             {/* RIGHT SIDE CHAT */}
//             <Box
//                 sx={{
//                     width: { xs: "100%", md: 360 },
//                     display: "flex",
//                     flexDirection: "column",
//                     borderLeft: { xs: "none", md: "1px solid #241f31" },
//                     borderTop: { xs: "1px solid #241f31", md: "none" },
//                     p: { xs: 1.5, md: 2 },
//                     bgcolor: "#0b0810",
//                 }}
//             >
//                 <Typography sx={{ color: "#fff", mb: 1 }}>Live Chat</Typography>

//                 <Paper
//                     sx={{
//                         flex: 1,
//                         overflowY: "auto",
//                         p: 2,
//                         bgcolor: "#1e1628",
//                         mb: 2,
//                         borderRadius: 2,
//                     }}
//                 >
//                     {chat.map((m, i) => (
//                         <Box
//                             key={i}
//                             sx={{
//                                 mb: 2,
//                                 p: 1.5,
//                                 bgcolor: "#2a2236",
//                                 borderRadius: 2,
//                             }}
//                         >
//                             <Typography
//                                 sx={{
//                                     fontSize: 13,
//                                     color: "#a78bfa",
//                                     fontWeight: 600,
//                                     mb: 0.5,
//                                 }}
//                             >
//                                 {m.from}
//                             </Typography>

//                             <Typography
//                                 sx={{
//                                     fontSize: 14,
//                                     color: "#ddd",
//                                     lineHeight: 1.4,
//                                 }}
//                             >
//                                 {m.text}
//                             </Typography>
//                         </Box>
//                     ))}
//                 </Paper>

//                 <Box sx={{ display: "flex", gap: 1 }}>
//                     <TextField
//                         value={msg}
//                         onChange={(e) => setMsg(e.target.value)}
//                         fullWidth
//                         placeholder="Say something..."
//                         multiline
//                         minRows={1}
//                         maxRows={3}
//                         sx={{
//                             "& .MuiInputBase-root": {
//                                 color: "#fff",
//                                 padding: "6px 12px",
//                                 fontSize: "15px",
//                                 bgcolor: "#131016",
//                             },
//                         }}
//                     />
//                     <Button variant="contained" onClick={sendMsg}>
//                         SEND
//                     </Button>
//                 </Box>
//             </Box>

//             {/* 🔊 MIC WARNING POPUP */}
//             {showMicWarning && isStreaming && showQuestions && (
//                 <Box
//                     sx={{
//                         position: "fixed",
//                         bottom: 16,
//                         left: "50%",
//                         transform: "translateX(-50%)",
//                         bgcolor: "#333",
//                         color: "#fff",
//                         px: 2,
//                         py: 1.5,
//                         borderRadius: 2,
//                         boxShadow: 4,
//                         display: "flex",
//                         alignItems: "center",
//                         gap: 1,
//                         zIndex: 9999,
//                         maxWidth: 420,
//                     }}
//                 >
//                     <Typography sx={{ fontSize: 14, flex: 1 }}>
//                         We are not receiving your voice. Please check your microphone.
//                         If you don't speak, your answer will not be recorded.
//                     </Typography>
//                     <IconButton
//                         size="small"
//                         onClick={() => setShowMicWarning(false)}
//                         sx={{ color: "#fff" }}
//                     >
//                         <CloseIcon fontSize="small" />
//                     </IconButton>
//                 </Box>
//             )}

//             <style jsx global>{`
//                 @keyframes blink {
//                     0% {
//                         opacity: 1;
//                     }
//                     50% {
//                         opacity: 0.3;
//                     }
//                     100% {
//                         opacity: 1;
//                     }
//                 }
//             `}</style>
//         </Box>
//     );
// }









// "use client";
// import React, { useEffect, useRef, useState, use } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import { Room, LocalVideoTrack, LocalAudioTrack } from "livekit-client";
// import { Box, Typography, Paper, TextField, Button, IconButton } from "@mui/material";
// import VisibilityIcon from "@mui/icons-material/Visibility";
// import CloseIcon from "@mui/icons-material/Close";
// import SpeechRecognition, {
//     useSpeechRecognition,
// } from "react-speech-recognition";

// const LIVEKIT_WS = process.env.NEXT_PUBLIC_LIVEKIT_URL;
// const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// export default function LiveRoom({ params }) {
//     const router = useRouter();
//     const { room } = use(params);
//     const search = useSearchParams();
//     const name = search.get("name") || "guest";

//     const [viewerCount, setViewer] = useState(0);
//     const [lkRoom, setLkRoom] = useState(null);
//     const [egressId, setEgressId] = useState(null);
//     const egressIdRef = useRef(null);
//     const [isStreaming, setIsStreaming] = useState(false);
//     const videoRef = useRef(null);
//     const screenStreamRef = useRef(null);
//     const joinedRef = useRef(false);

//     const questions = [
//         "Tell me about yourself?",
//         "What are your strengths?",
//         "What is your biggest weakness?",
//         "Where do you see yourself in 5 years?",
//         "Why should we hire you?",
//     ];

//     const [showQuestions, setShowQuestions] = useState(false);
//     const [qIndex, setQIndex] = useState(0);
//     const [cameraHeight, setCameraHeight] = useState("80vh");

//     // Prevent tab switch
//     const tabSwitchAttempts = useRef(0);

//     useEffect(() => {
//         if (!isStreaming) return;

//         const warnUser = () => {
//             tabSwitchAttempts.current += 1;

//             alert(
//                 `You cannot switch tabs or windows during the interview!\n\n` +
//                 `Attempt: ${tabSwitchAttempts.current}`
//             );

//             window.focus();
//         };

//         const handleBlur = () => {
//             warnUser();
//         };

//         const handleVisibilityChange = () => {
//             if (document.hidden && isStreaming) {
//                 warnUser();
//             }
//         };

//         window.addEventListener("blur", handleBlur);
//         document.addEventListener("visibilitychange", handleVisibilityChange);

//         return () => {
//             window.removeEventListener("blur", handleBlur);
//             document.removeEventListener("visibilitychange", handleVisibilityChange);
//         };
//     }, [isStreaming]);

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

//     // mic silence detect
//     const [showMicWarning, setShowMicWarning] = useState(false);
//     const lastVoiceTimeRef = useRef(null);
//     const lastTranscriptRef = useRef("");

//     const stopAllTracks = () => {
//         try {
//             mediaTracksRef.current.forEach(track => {
//                 try {
//                     track.stop();
//                 } catch (e) {
//                     console.warn("Error stopping track:", e);
//                 }
//             });
//             mediaTracksRef.current = [];

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
//             console.warn("⚠️ No egressId available, skipping egress stop");
//             return;
//         }

//         for (let i = 0; i < 3; i++) {
//             try {
//                 console.log("🛑 Attempting to stop egress...", i + 1);

//                 const res = await fetch(`${API_BASE}/egress/stop`, {
//                     method: "POST",
//                     headers: { "Content-Type": "application/json" },
//                     body: JSON.stringify({ egressId: id }),
//                 });

//                 const j = await res.json();
//                 console.log("EGRESS STOP RESPONSE:", j);

//                 if (j.ok) {
//                     console.log("✅ Egress stopped successfully");
//                     return;
//                 }
//             } catch (err) {
//                 console.error("⚠️ Egress stop failed attempt:", i + 1, err);
//             }

//             await new Promise((r) => setTimeout(r, 300));
//         }

//         console.error("❌ Failed to stop egress after 3 attempts");
//     };

//     const stopEverything = async (
//         reasonMessage = "Live stopped.",
//         isManualStop = false
//     ) => {
//         if (forcedStopRef.current) return;
//         forcedStopRef.current = true;

//         console.log("🛑 Stopping everything...");

//         try {
//             if (screenStreamRef.current) {
//                 screenStreamRef.current.getTracks().forEach(t => t.stop());
//                 screenStreamRef.current = null;
//             }
//         } catch { }

//         if (transcript.trim()) {
//             const endTime = Date.now();
//             const logEntry = {
//                 question: questions[qIndex],
//                 answer: transcript.trim(),
//                 startTime: currentAnswerStartTime,
//                 endTime: endTime,
//             };

//             setQuestionLogs((prev) => {
//                 const updated = [...prev, logEntry];
//                 console.log("========= FINAL LOGS =========");
//                 console.log(updated);
//                 console.log("==============================");
//                 return updated;
//             });
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

//         if (reasonMessage) {
//             alert(reasonMessage);
//         }

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
//             console.warn("⚠️ Tab became hidden while streaming");
//         }
//     };

//     useEffect(() => {
//         console.log("Browser speech support?", browserSupportsSpeechRecognition);
//     }, [browserSupportsSpeechRecognition]);

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
//             } catch { }
//             SpeechRecognition.stopListening();

//             window.removeEventListener("beforeunload", handleBeforeUnload);
//             document.removeEventListener("visibilitychange", handleVisibilityChange);
//         };
//     }, [room]);

//     const startScreenShare = async (roomObj) => {
//         try {
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

//             console.log("🖥️ Screen share settings:", settings);

//             if (settings.displaySurface !== "monitor") {
//                 videoTrack.stop();
//                 alert("Please select ENTIRE SCREEN");
//                 setTimeout(() => startScreenShare(roomObj), 1000);
//                 return;
//             }

//             const screenTrack = new LocalVideoTrack(videoTrack);

//             videoTrack.onended = () => {
//                 console.warn("⚠️ Screen share manually stopped");
//                 stopEverything(
//                     "Screen share was stopped. Live stream will stop.",
//                     true
//                 );
//             };

//             await roomObj.localParticipant.publishTrack(screenTrack);
//             console.log("🖥️ Full Screen Share Published");
//         } catch (err) {
//             console.error("❌ Screen share error:", err);
//         }
//     };

//     const joinRoom = async (roomName) => {
//         const tokenRes = await fetch(`${API_BASE}/token`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ roomName, identity: name }),
//         });
//         const { token } = await tokenRes.json();

//         const r = new Room();
//         await r.connect(LIVEKIT_WS, token);
//         setLkRoom(r);

//         const camStream = await navigator.mediaDevices.getUserMedia({
//             video: true,
//             audio: false,
//         });
//         const [vTrackRaw] = camStream.getVideoTracks();

//         mediaTracksRef.current.push(vTrackRaw);

//         vTrackRaw.onended = () => {
//             console.warn("⚠️ Camera manually turned off");
//             stopEverything(
//                 "Camera was turned off manually. Live stream will stop.",
//                 true
//             );
//         };

//         const vTrack = new LocalVideoTrack(vTrackRaw);
//         attach(vTrack, videoRef.current);
//         await r.localParticipant.publishTrack(vTrack);

//         const micStream = await navigator.mediaDevices.getUserMedia({
//             audio: {
//                 echoCancellation: true,
//                 noiseSuppression: true,
//             },
//         });
//         const [micRaw] = micStream.getAudioTracks();

//         mediaTracksRef.current.push(micRaw);

//         micRaw.onended = () => {
//             console.warn("⚠️ Microphone manually turned off");
//             stopEverything(
//                 "Microphone was turned off manually. Live stream will stop.",
//                 true
//             );
//         };

//         const aTrack = new LocalAudioTrack(micRaw);
//         await r.localParticipant.publishTrack(aTrack);

//         await startScreenShare(r);
//         await startEgress(roomName);

//         const updateCount = () => {
//             if (!r || r.state !== "connected" || !r.participants) return;
//             setViewer(r.participants.size + 1);
//         };

//         r.on("participantConnected", updateCount);
//         r.on("participantDisconnected", updateCount);
//         updateCount();
//     };

//     const attach = (track, el) => {
//         const node = track.attach();
//         node.muted = true;
//         node.playsInline = true;
//         node.style.width = "100%";
//         node.style.height = "100%";
//         node.style.objectFit = "cover";
//         el.innerHTML = "";
//         el.appendChild(node);
//     };

//     const startEgress = async (roomName) => {
//         const res = await fetch(`${API_BASE}/egress/start`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ roomName }),
//         });

//         const j = await res.json();

//         if (j.ok) {
//             setEgressId(j.egressId);
//             egressIdRef.current = j.egressId;

//             setIsStreaming(true);

//             setShowQuestions(true);
//             setQIndex(0);
//             setCameraHeight("65vh");

//             const start = Date.now();
//             setStreamStartTime(start);
//             setCurrentAnswerStartTime(start);

//             lastVoiceTimeRef.current = start;
//             lastTranscriptRef.current = "";
//             setShowMicWarning(false);

//             resetTranscript();
//             setQuestionLogs([]);

//             try {
//                 await SpeechRecognition.startListening({
//                     continuous: true,
//                     language: "en-IN",
//                 });
//                 console.log("🎙️ Speech recognition started");
//             } catch (e) {
//                 console.error("Speech start error:", e);
//             }
//         }
//     };

//     const nextQuestion = () => {
//         const endTime = Date.now();

//         const logEntry = {
//             question: questions[qIndex],
//             answer: transcript.trim(),
//             startTime: currentAnswerStartTime,
//             endTime: endTime,
//         };

//         console.log("========== ANSWER SAVED ==========");
//         console.log(logEntry);
//         console.log("==================================");

//         setQuestionLogs((prev) => [...prev, logEntry]);
//         resetTranscript();

//         if (qIndex < questions.length - 1) {
//             const newIndex = qIndex + 1;
//             setQIndex(newIndex);
//             const newStart = Date.now();
//             setCurrentAnswerStartTime(newStart);

//             lastVoiceTimeRef.current = newStart;
//             lastTranscriptRef.current = "";
//             setShowMicWarning(false);
//         } else {
//             setShowQuestions(false);
//             setCameraHeight("80vh");
//             SpeechRecognition.stopListening();
//             console.log("🎙️ Speech recognition stopped");
//             setShowMicWarning(false);
//         }
//     };

//     const stopEgress = async () => {
//         await stopEverything("Live Stopped Successfully!", true);
//     };

//     // watch transcript
//     useEffect(() => {
//         if (!isStreaming || !showQuestions) return;

//         if (!lastVoiceTimeRef.current) {
//             lastVoiceTimeRef.current = Date.now();
//         }

//         if (
//             transcript !== lastTranscriptRef.current &&
//             transcript.trim().length > 0
//         ) {
//             lastTranscriptRef.current = transcript;
//             lastVoiceTimeRef.current = Date.now();

//             if (showMicWarning) {
//                 setShowMicWarning(false);
//             }
//         }
//     }, [transcript, isStreaming, showQuestions, showMicWarning]);

//     // silence timer
//     useEffect(() => {
//         if (!isStreaming || !showQuestions) {
//             setShowMicWarning(false);
//             return;
//         }

//         const id = setInterval(() => {
//             if (!lastVoiceTimeRef.current) return;

//             const diff = Date.now() - lastVoiceTimeRef.current;

//             if (diff >= 10000) {
//                 setShowMicWarning(true);
//             }
//         }, 1000);

//         return () => clearInterval(id);
//     }, [isStreaming, showQuestions]);

//     return (
//         <Box
//             sx={{
//                 display: "flex",
//                 height: "100vh",
//                 bgcolor: "#0b0810",
//                 flexDirection: { xs: "column", md: "row" },
//             }}
//         >
//             {/* LEFT SIDE */}
//             <Box sx={{ flex: 1, p: { xs: 1.5, md: 2 } }}>
//                 <Box
//                     sx={{
//                         display: "flex",
//                         justifyContent: "space-between",
//                         alignItems: "center",
//                         mb: 1,
//                     }}
//                 >
//                     <Typography sx={{ color: "#fff", fontWeight: 700 }}>
//                         {room}
//                     </Typography>

//                     <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
//                         {isStreaming ? (
//                             <Button
//                                 variant="contained"
//                                 color="error"
//                                 onClick={stopEgress}
//                                 sx={{ bgcolor: "#ff3b3b" }}
//                             >
//                                 Stop Live
//                             </Button>
//                         ) : (
//                             <Typography sx={{ color: "#aaa" }}>
//                                 Stream stopped
//                             </Typography>
//                         )}

//                         <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
//                             <Box
//                                 sx={{
//                                     width: 10,
//                                     height: 10,
//                                     borderRadius: "50%",
//                                     bgcolor: isStreaming ? "red" : "gray",
//                                     animation: isStreaming ? "blink 1s infinite" : "none",
//                                 }}
//                             />
//                             <Typography sx={{ color: "#fff" }}>
//                                 {isStreaming ? "LIVE" : "OFF"}
//                             </Typography>
//                             <VisibilityIcon fontSize="small" sx={{ color: "#fff" }} />
//                             <Typography sx={{ color: "#fff" }}>
//                                 {viewerCount}
//                             </Typography>
//                         </Box>
//                     </Box>
//                 </Box>

//                 {/* QUESTION BAR */}
//                 {showQuestions && (
//                     <Box
//                         sx={{
//                             bgcolor: "#1e1628",
//                             color: "#fff",
//                             p: 2,
//                             mb: 1,
//                             borderRadius: 2,
//                             display: "flex",
//                             justifyContent: "space-between",
//                             alignItems: "center",
//                             fontSize: 16,
//                             fontWeight: 600,
//                         }}
//                     >
//                         <Typography>{questions[qIndex]}</Typography>

//                         <Button
//                             variant="contained"
//                             sx={{ bgcolor: "#6f5bd4" }}
//                             onClick={nextQuestion}
//                         >
//                             Next
//                         </Button>
//                     </Box>
//                 )}

//                 {/* CAMERA */}
//                 <Paper
//                     sx={{
//                         height: { xs: "45vh", md: cameraHeight },
//                         transition: "height .4s",
//                         overflow: "hidden",
//                         bgcolor: "#000",
//                     }}
//                 >
//                     <div ref={videoRef} style={{ width: "100%", height: "100%" }} />
//                 </Paper>
//             </Box>

//             {/* MIC WARNING POPUP */}
//             {showMicWarning && isStreaming && showQuestions && (
//                 <Box
//                     sx={{
//                         position: "fixed",
//                         bottom: 16,
//                         left: "50%",
//                         transform: "translateX(-50%)",
//                         bgcolor: "#333",
//                         color: "#fff",
//                         px: 2,
//                         py: 1.5,
//                         borderRadius: 2,
//                         boxShadow: 4,
//                         display: "flex",
//                         alignItems: "center",
//                         gap: 1,
//                         zIndex: 9999,
//                         maxWidth: 420,
//                     }}
//                 >
//                     <Typography sx={{ fontSize: 14, flex: 1 }}>
//                         We are not receiving your voice. Please check your microphone.
//                         If you don't speak, your answer will not be recorded.
//                     </Typography>
//                     <IconButton
//                         size="small"
//                         onClick={() => setShowMicWarning(false)}
//                         sx={{ color: "#fff" }}
//                     >
//                         <CloseIcon fontSize="small" />
//                     </IconButton>
//                 </Box>
//             )}

//             <style jsx global>{`
//                 @keyframes blink {
//                     0% {
//                         opacity: 1;
//                     }
//                     50% {
//                         opacity: 0.3;
//                     }
//                     100% {
//                         opacity: 1;
//                     }
//                 }
//             `}</style>
//         </Box>
//     );
// }
















"use client";
import React, { useEffect, useRef, useState, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Room, LocalVideoTrack, LocalAudioTrack } from "livekit-client";
import { Box, Typography, Paper, TextField, Button, IconButton } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import SpeechRecognition, {
    useSpeechRecognition,
} from "react-speech-recognition";
import "./page.css"

const LIVEKIT_WS = process.env.NEXT_PUBLIC_LIVEKIT_URL;
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function LiveRoom({ params }) {
    const router = useRouter();
    const { room } = use(params);
    const search = useSearchParams();
    const name = search.get("name") || "guest";

    const [viewerCount, setViewer] = useState(0);
    const [lkRoom, setLkRoom] = useState(null);
    const [egressId, setEgressId] = useState(null);
    const egressIdRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const videoRef = useRef(null);
    const screenStreamRef = useRef(null);
    const joinedRef = useRef(false);

    const questions = [
        "Tell me about yourself?",
        "Explain your approach to understanding user needs when you don't have access to direct users?",
        "What are your strengths?",
        "What is your biggest weakness?",
        "Explain your approach to understanding user needs when you don't have access to direct users?",
        "Where do you see yourself in 5 years?",
        "Why should we hire you?",
        "Explain your approach to understanding user needs when you don't have access to direct users?"
    ];

    const [showQuestions, setShowQuestions] = useState(false);
    const [qIndex, setQIndex] = useState(0);

    // Prevent tab switch
    const tabSwitchAttempts = useRef(0);

    // useEffect(() => {
    //     if (!isStreaming) return;

    //     const warnUser = () => {
    //         tabSwitchAttempts.current += 1;
    //         alert(
    //             `You cannot switch tabs or windows during the interview!\n\n` +
    //             `Attempt: ${tabSwitchAttempts.current}`
    //         );
    //         window.focus();
    //     };

    //     const handleBlur = () => {
    //         warnUser();
    //     };

    //     const handleVisibilityChange = () => {
    //         if (document.hidden && isStreaming) {
    //             warnUser();
    //         }
    //     };

    //     window.addEventListener("blur", handleBlur);
    //     document.addEventListener("visibilitychange", handleVisibilityChange);

    //     return () => {
    //         window.removeEventListener("blur", handleBlur);
    //         document.removeEventListener("visibilitychange", handleVisibilityChange);
    //     };
    // }, [isStreaming]);

    // Speech recognition


    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition,
    } = useSpeechRecognition();

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

    const stopAllTracks = () => {
        try {
            mediaTracksRef.current.forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    console.warn("Error stopping track:", e);
                }
            });
            mediaTracksRef.current = [];

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
            console.warn("⚠️ No egressId available, skipping egress stop");
            return;
        }

        for (let i = 0; i < 3; i++) {
            try {
                console.log("🛑 Attempting to stop egress...", i + 1);

                const res = await fetch(`${API_BASE}/egress/stop`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ egressId: id }),
                });

                const j = await res.json();
                console.log("EGRESS STOP RESPONSE:", j);

                if (j.ok) {
                    console.log("✅ Egress stopped successfully");
                    return;
                }
            } catch (err) {
                console.error("⚠️ Egress stop failed attempt:", i + 1, err);
            }

            await new Promise((r) => setTimeout(r, 300));
        }

        console.error("❌ Failed to stop egress after 3 attempts");
    };

    const stopEverything = async (
        reasonMessage = "Live stopped.",
        isManualStop = false
    ) => {
        if (forcedStopRef.current) return;
        forcedStopRef.current = true;

        console.log("🛑 Stopping everything...");

        try {
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(t => t.stop());
                screenStreamRef.current = null;
            }
        } catch { }

        if (transcript.trim()) {
            const endTime = Date.now();
            const logEntry = {
                question: questions[qIndex],
                answer: transcript.trim(),
                startTime: currentAnswerStartTime,
                endTime: endTime,
            };

            setQuestionLogs((prev) => {
                const updated = [...prev, logEntry];
                console.log("========= FINAL LOGS =========");
                console.log(updated);
                console.log("==============================");
                return updated;
            });
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

        if (reasonMessage) {
            alert(reasonMessage);
        }

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
            console.warn("⚠️ Tab became hidden while streaming");
        }
    };

    useEffect(() => {
        console.log("Browser speech support?", browserSupportsSpeechRecognition);
    }, [browserSupportsSpeechRecognition]);

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
            } catch { }
            SpeechRecognition.stopListening();

            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [room]);

    const startScreenShare = async (roomObj) => {
        try {
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

            console.log("🖥️ Screen share settings:", settings);

            if (settings.displaySurface !== "monitor") {
                videoTrack.stop();
                alert("Please select ENTIRE SCREEN");
                setTimeout(() => startScreenShare(roomObj), 1000);
                return;
            }

            const screenTrack = new LocalVideoTrack(videoTrack);

            videoTrack.onended = () => {
                console.warn("⚠️ Screen share manually stopped");
                stopEverything(
                    "Screen share was stopped. Live stream will stop.",
                    true
                );
            };

            await roomObj.localParticipant.publishTrack(screenTrack);
            console.log("🖥️ Full Screen Share Published");
        } catch (err) {
            console.error("❌ Screen share error:", err);
        }
    };

    const joinRoom = async (roomName) => {
        const tokenRes = await fetch(`${API_BASE}/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomName, identity: name }),
        });
        const { token } = await tokenRes.json();

        const r = new Room();
        await r.connect(LIVEKIT_WS, token);
        setLkRoom(r);

        const camStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
        });
        const [vTrackRaw] = camStream.getVideoTracks();

        mediaTracksRef.current.push(vTrackRaw);

        vTrackRaw.onended = () => {
            console.warn("⚠️ Camera manually turned off");
            stopEverything(
                "Camera was turned off manually. Live stream will stop.",
                true
            );
        };

        const vTrack = new LocalVideoTrack(vTrackRaw);
        attach(vTrack, videoRef.current);
        await r.localParticipant.publishTrack(vTrack);

        const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
            },
        });
        const [micRaw] = micStream.getAudioTracks();

        mediaTracksRef.current.push(micRaw);

        micRaw.onended = () => {
            console.warn("⚠️ Microphone manually turned off");
            stopEverything(
                "Microphone was turned off manually. Live stream will stop.",
                true
            );
        };

        const aTrack = new LocalAudioTrack(micRaw);
        await r.localParticipant.publishTrack(aTrack);

        // await startScreenShare(r);
        await startEgress(roomName);

        const updateCount = () => {
            if (!r || r.state !== "connected" || !r.participants) return;
            setViewer(r.participants.size + 1);
        };

        r.on("participantConnected", updateCount);
        r.on("participantDisconnected", updateCount);
        updateCount();
    };

    const attach = (track, el) => {
        const node = track.attach();
        node.muted = true;
        node.playsInline = true;
        node.style.width = "100%";
        node.style.height = "100%";
        node.style.objectFit = "cover";
        el.innerHTML = "";
        el.appendChild(node);
    };

    const startEgress = async (roomName) => {
        const res = await fetch(`${API_BASE}/egress/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomName }),
        });

        const j = await res.json();

        if (j.ok) {
            setEgressId(j.egressId);
            egressIdRef.current = j.egressId;

            setIsStreaming(true);

            setShowQuestions(true);
            setQIndex(0);

            const start = Date.now();
            setStreamStartTime(start);
            setCurrentAnswerStartTime(start);

            lastVoiceTimeRef.current = start;
            lastTranscriptRef.current = "";
            setShowMicWarning(false);

            resetTranscript();
            setQuestionLogs([]);

            try {
                await SpeechRecognition.startListening({
                    continuous: true,
                    language: "en-IN",
                });
                console.log("🎙️ Speech recognition started");
            } catch (e) {
                console.error("Speech start error:", e);
            }
        }
    };

    const nextQuestion = () => {
        const endTime = Date.now();

        const logEntry = {
            question: questions[qIndex],
            answer: transcript.trim(),
            startTime: currentAnswerStartTime,
            endTime: endTime,
        };

        console.log("========== ANSWER SAVED ==========");
        console.log(logEntry);
        console.log("==================================");

        setQuestionLogs((prev) => [...prev, logEntry]);
        resetTranscript();

        if (qIndex < questions.length - 1) {
            const newIndex = qIndex + 1;
            setQIndex(newIndex);
            const newStart = Date.now();
            setCurrentAnswerStartTime(newStart);

            lastVoiceTimeRef.current = newStart;
            lastTranscriptRef.current = "";
            setShowMicWarning(false);
        } else {
            setShowQuestions(false);
            SpeechRecognition.stopListening();
            console.log("🎙️ Speech recognition stopped");
            setShowMicWarning(false);
        }
    };

    const stopEgress = async () => {
        await stopEverything("Live Stopped Successfully!", true);
    };

    // watch transcript
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

    // silence timer
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

    return (
        <Box className="interview-container">

            {/* Main Card */}
            <Box className="interview-card">

                {/* Header */}
                <Box className="interview-header">

                    <Box className="role-section">
                        <img src="/images/briefcase.png" alt="role icon" className="role-icon" />
                        <Typography className="role-text">UX Designer</Typography>
                    </Box>


                    <Box className="timer-section">
                        <img src="/images/interview.png" alt="timer label" className="timer-image" />
                        <Typography className="timer-value">24:48</Typography>
                    </Box>


                    {/* Next / Stop Button (Switch based on question availability) */}
                    <Box className="next-question-section">
                        {qIndex < questions.length - 1 ? (
                            <Button
                                className="next-question-btn"
                                onClick={nextQuestion}
                            >
                                <span className="next-text">Next question</span>
                                <img
                                    src="/images/nextq.png"
                                    alt="arrow"
                                    className="next-arrow"
                                />
                            </Button>
                        ) : (
                            <Button
                                className="stop-btn-final"
                                onClick={stopEgress}
                            >
                                Submit
                            </Button>
                        )}
                    </Box>


                </Box>

                {showQuestions && (
                    <Box className="question-section">

                        {/* LEFT: Icon + Q number box */}
                        <Box className="q-badge">
                            <img
                                src="/images/question.png"
                                className="q-icon"
                                alt="question icon"
                            />
                            <Typography className="q-number">
                                Q {qIndex + 1}
                            </Typography>
                        </Box>

                        {/* Divider line */}
                        <Box className="q-divider" />

                        {/* Question text */}
                        <Typography className="question-text">
                            {questions[qIndex]}
                        </Typography>

                    </Box>
                )}


                {/* Camera */}
                <Box className="camera-section">
                    <div ref={videoRef} className="camera-feed" />
                    <Box className="next-mobile-wrapper">
                        {qIndex < questions.length - 1 ? (
                            <button className="next-mobile-btn" onClick={nextQuestion}>
                                <svg
                                    className="next-mobile-arrow"
                                    viewBox="0 0 24 24"
                                    stroke="white"
                                    strokeWidth="3"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M8 4l8 8-8 8" />
                                </svg>
                            </button>
                        ) : (
                            <button className="submit-mobile-btn" onClick={stopEgress}>
                                ✔
                            </button>
                        )}
                    </Box>
                </Box>


                {/* <Box className="status-bar">
                    {isStreaming && (
                        <Button
                            className="stop-live-btn"
                            onClick={stopEgress}
                        >
                            Stop Live
                        </Button>
                    )}
                </Box>  */}
            </Box>

            {/* MIC WARNING POPUP */}
            {showMicWarning && isStreaming && showQuestions && (
                <Box className="mic-warning-popup">
                    <Typography className="warning-text">
                        We are not receiving your voice. Please check your microphone.
                    </Typography>
                    <IconButton
                        className="close-warning-btn"
                        onClick={() => setShowMicWarning(false)}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
            )}
        </Box>
    );
} 