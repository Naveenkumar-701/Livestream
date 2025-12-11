// "use client";
// import { useEffect, useRef, useState } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import { Box, Button, Typography, Paper, CircularProgress } from "@mui/material";

// export default function CheckPermissions() {
//     const router = useRouter();
//     const search = useSearchParams();
//     const room = search.get("room");
//     const name = search.get("name");
//     const interviewId = search.get("interviewId") || "";
//     const cid = search.get("cid") || "";

//     const videoRef = useRef(null);
//     const previewStreamRef = useRef(null);

//     const [camStatus, setCamStatus] = useState("checking"); // checking, success, error
//     const [micStatus, setMicStatus] = useState("checking"); // checking, success, error
//     const [checking, setChecking] = useState(true);

//     useEffect(() => {
//         checkPermissions();
//     }, []);

//     const checkPermissions = async () => {
//         setChecking(true);
//         setCamStatus("checking");
//         setMicStatus("checking");

//         try {
//             // Request camera and microphone access
//             const testStream = await navigator.mediaDevices.getUserMedia({
//                 video: true,
//                 audio: true,
//             });

//             previewStreamRef.current = testStream;

//             // Attach video preview
//             if (videoRef.current) {
//                 videoRef.current.srcObject = testStream;
//                 videoRef.current.play();
//             }

//             // Check tracks with a small delay to ensure they're working
//             await new Promise(resolve => setTimeout(resolve, 500));

//             const vtrack = testStream.getVideoTracks()[0];
//             const atrack = testStream.getAudioTracks()[0];

//             // Simulate checking each device separately with a small delay
//             setTimeout(() => {
//                 setCamStatus(vtrack?.readyState === "live" ? "success" : "error");
//             }, 300);

//             setTimeout(() => {
//                 setMicStatus(atrack?.readyState === "live" ? "success" : "error");
//             }, 600);

//         } catch (err) {
//             console.error("Permission check error:", err);
//             setCamStatus("error");
//             setMicStatus("error");
//         } finally {
//             setTimeout(() => {
//                 setChecking(false);
//             }, 800);
//         }
//     };

//     const stopPreviewStream = () => {
//         try {
//             if (previewStreamRef.current) {
//                 previewStreamRef.current.getTracks().forEach((t) => t.stop());
//                 previewStreamRef.current = null;
//             }

//             if (videoRef.current) {
//                 videoRef.current.srcObject = null;
//             }
//         } catch (err) {
//             console.error("Preview stop error:", err);
//         }
//     };

//     const goNext = () => {
//         stopPreviewStream();
//         router.push(`/stream/room/${room}?name=${name}&interviewId=${interviewId}&cid=${cid}`);
//     };

//     const getStatusMessage = (status, device) => {
//         switch (status) {
//             case "checking":
//                 return `Checking ${device}...`;
//             case "success":
//                 return `✔ ${device} Working`;
//             case "error":
//                 return `❌ ${device} Not Working`;
//             default:
//                 return device;
//         }
//     };

//     const getStatusColor = (status) => {
//         switch (status) {
//             case "checking":
//                 return "#f0b400"; // Yellow for checking
//             case "success":
//                 return "#00ff9d"; // Green for success
//             case "error":
//                 return "#ff4757"; // Red for error
//             default:
//                 return "#ffffff";
//         }
//     };

//     return (
//         <Box
//             sx={{
//                 bgcolor: "#0f0d16",
//                 minHeight: "100vh",
//                 display: "flex",
//                 justifyContent: "center",
//                 alignItems: "center",
//                 p: 2,
//             }}
//         >
//             <Paper
//                 sx={{
//                     p: 3,
//                     width: 420,
//                     bgcolor: "#1b1726",
//                     borderRadius: 3,
//                     boxShadow: "0px 0px 20px rgba(255,255,255,0.08)",
//                 }}
//             >
//                 <Typography sx={{ color: "#fff", fontSize: 18, mb: 2 }}>
//                     Camera & Microphone Check
//                 </Typography>

//                 {/* VIDEO PREVIEW */}
//                 <Paper
//                     sx={{
//                         height: 220,
//                         overflow: "hidden",
//                         borderRadius: 2,
//                         bgcolor: "#000",
//                         mb: 2,
//                         position: "relative",
//                     }}
//                 >
//                     <video
//                         ref={videoRef}
//                         style={{
//                             width: "100%",
//                             height: "100%",
//                             objectFit: "cover",
//                         }}
//                         muted
//                         playsInline
//                     />

//                     {/* Loading overlay for video preview */}
//                     {camStatus === "checking" && (
//                         <Box
//                             sx={{
//                                 position: "absolute",
//                                 top: 0,
//                                 left: 0,
//                                 right: 0,
//                                 bottom: 0,
//                                 display: "flex",
//                                 justifyContent: "center",
//                                 alignItems: "center",
//                                 bgcolor: "rgba(0, 0, 0, 0.7)",
//                             }}
//                         >
//                             <CircularProgress sx={{ color: "#7b5de3" }} />
//                         </Box>
//                     )}
//                 </Paper>

//                 {/* Camera Status */}
//                 <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
//                     <Typography sx={{ color: getStatusColor(camStatus), mr: 1 }}>
//                         {getStatusMessage(camStatus, "Camera")}
//                     </Typography>
//                     {camStatus === "checking" && (
//                         <CircularProgress size={16} sx={{ color: "#f0b400" }} />
//                     )}
//                 </Box>

//                 {/* Microphone Status */}
//                 <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
//                     <Typography sx={{ color: getStatusColor(micStatus), mr: 1 }}>
//                         {getStatusMessage(micStatus, "Microphone")}
//                     </Typography>
//                     {micStatus === "checking" && (
//                         <CircularProgress size={16} sx={{ color: "#f0b400" }} />
//                     )}
//                 </Box>

//                 <Button
//                     variant="contained"
//                     fullWidth
//                     onClick={goNext}
//                     disabled={camStatus !== "success" || micStatus !== "success" || checking}
//                     sx={{
//                         bgcolor: (camStatus !== "success" || micStatus !== "success") ? "#444" : "#7b5de3",
//                         "&:hover": { bgcolor: "#6a4eda" },
//                         height: 42,
//                         mt: 1,
//                     }}
//                 >
//                     {checking ? "Checking Devices..." : "Continue to Room"}
//                 </Button>
//             </Paper>
//         </Box>
//     );
// }




"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Box, Button, Typography, Paper, CircularProgress } from "@mui/material";

export default function CheckPermissions() {
    const router = useRouter();
    const search = useSearchParams();
    const room = search.get("room");
    const name = search.get("name");
    const interviewId = search.get("interviewId") || "";
    const cid = search.get("cid") || "";

    const videoRef = useRef(null);
    const previewStreamRef = useRef(null);

    const [camStatus, setCamStatus] = useState("checking"); // checking, success, error
    const [micStatus, setMicStatus] = useState("checking"); // checking, success, error
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkPermissions();
        return () => stopPreviewStream();
    }, []);

    const checkPermissions = async () => {
        setChecking(true);
        setCamStatus("checking");
        setMicStatus("checking");

        try {
            // ✅ CAMERA ONLY — DO NOT OPEN MIC
            const testStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
            });

            previewStreamRef.current = testStream;

            if (videoRef.current) {
                videoRef.current.srcObject = testStream;
                videoRef.current.play();
            }

            await new Promise((r) => setTimeout(r, 500));

            // ✅ CAMERA STATUS
            const vtrack = testStream.getVideoTracks()[0];
            setTimeout(() => {
                setCamStatus(vtrack?.readyState === "live" ? "success" : "error");
            }, 300);

            // ✅ MICROPHONE CHECK (NO AUDIO CAPTURE)
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasMic = devices.some((d) => d.kind === "audioinput");

            setTimeout(() => {
                setMicStatus(hasMic ? "success" : "error");
            }, 600);
        } catch (err) {
            console.error("Permission check error:", err);
            setCamStatus("error");
            setMicStatus("error");
        } finally {
            setTimeout(() => setChecking(false), 800);
        }
    };

    const stopPreviewStream = () => {
        try {
            if (previewStreamRef.current) {
                previewStreamRef.current.getTracks().forEach((t) => t.stop());
                previewStreamRef.current = null;
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        } catch (err) {
            console.error("Preview stop error:", err);
        }
    };

    const goNext = () => {
        stopPreviewStream();
        router.push(
            `/stream/room/${room}?name=${name}&interviewId=${interviewId}&cid=${cid}`
        );
    };

    const getStatusMessage = (status, device) => {
        switch (status) {
            case "checking":
                return `Checking ${device}...`;
            case "success":
                return `✔ ${device} Working`;
            case "error":
                return `❌ ${device} Not Working`;
            default:
                return device;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "checking":
                return "#f0b400";
            case "success":
                return "#00ff9d";
            case "error":
                return "#ff4757";
            default:
                return "#ffffff";
        }
    };

    return (
        <Box
            sx={{
                bgcolor: "#0f0d16",
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                p: 2,
            }}
        >
            <Paper
                sx={{
                    p: 3,
                    width: 420,
                    bgcolor: "#1b1726",
                    borderRadius: 3,
                    boxShadow: "0px 0px 20px rgba(255,255,255,0.08)",
                }}
            >
                <Typography sx={{ color: "#fff", fontSize: 18, mb: 2 }}>
                    Camera & Microphone Check
                </Typography>

                {/* CAMERA PREVIEW */}
                <Paper
                    sx={{
                        height: 220,
                        overflow: "hidden",
                        borderRadius: 2,
                        bgcolor: "#000",
                        mb: 2,
                        position: "relative",
                    }}
                >
                    <video
                        ref={videoRef}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        muted
                        playsInline
                    />

                    {camStatus === "checking" && (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                bgcolor: "rgba(0,0,0,0.7)",
                            }}
                        >
                            <CircularProgress sx={{ color: "#7b5de3" }} />
                        </Box>
                    )}
                </Paper>

                {/* CAMERA STATUS */}
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <Typography sx={{ color: getStatusColor(camStatus), mr: 1 }}>
                        {getStatusMessage(camStatus, "Camera")}
                    </Typography>
                    {camStatus === "checking" && (
                        <CircularProgress size={16} sx={{ color: "#f0b400" }} />
                    )}
                </Box>

                {/* MICROPHONE STATUS */}
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Typography sx={{ color: getStatusColor(micStatus), mr: 1 }}>
                        {getStatusMessage(micStatus, "Microphone")}
                    </Typography>
                    {micStatus === "checking" && (
                        <CircularProgress size={16} sx={{ color: "#f0b400" }} />
                    )}
                </Box>

                <Button
                    variant="contained"
                    fullWidth
                    onClick={goNext}
                    disabled={
                        camStatus !== "success" ||
                        micStatus !== "success" ||
                        checking
                    }
                    sx={{
                        bgcolor:
                            camStatus !== "success" || micStatus !== "success"
                                ? "#444"
                                : "#7b5de3",
                        "&:hover": { bgcolor: "#6a4eda" },
                        height: 42,
                        mt: 1,
                    }}
                >
                    {checking ? "Checking Devices..." : "Continue to Room"}
                </Button>
            </Paper>
        </Box>
    );
}
