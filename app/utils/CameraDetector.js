import React from "react";

export async function isCameraOn() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        if (videoDevices.length === 0) return {
            cameraOn: false,
            motionDetected: false,
            cameraHidden: true,
            error: "No camera devices found"
        };

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        const isCameraActive = track && track.readyState === "live";

        if (!isCameraActive) {
            track?.stop();
            return {
                cameraOn: false,
                motionDetected: false,
                cameraHidden: true,
                error: "Camera not active"
            };
        }

        const video = document.createElement("video");
        video.srcObject = stream;
        video.width = 320;
        video.height = 240;
        video.play();

        const canvas = document.createElement("canvas");
        canvas.width = video.width;
        canvas.height = video.height;
        const ctx = canvas.getContext("2d");

        function getFrameStats(frame) {
            const data = frame.data;
            const step = 4 * 10;
            let total = 0;
            let totalSq = 0;

            for (let i = 0; i < data.length; i += step) {
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                total += brightness;
                totalSq += brightness * brightness;
            }

            const n = data.length / step;
            const avg = total / n;
            const variance = totalSq / n - avg * avg;
            const stdDev = Math.sqrt(variance);

            return { avgBrightness: avg, brightnessStdDev: stdDev };
        }

        function detectMotion(frame1, frame2) {
            const d1 = frame1.data;
            const d2 = frame2.data;
            let diff = 0;
            const step = 4 * 10;

            for (let i = 0; i < d1.length; i += step) {
                diff += Math.abs(d1[i] - d2[i]);
            }

            return diff / (d1.length / step);
        }

        return await new Promise((resolve) => {
            let prevFrame = null;
            const motionLevels = [];
            const brightnessStats = [];
            let frameCount = 0;

            const capture = () => {
                ctx.drawImage(video, 0, 0, video.width, video.height);
                const frame = ctx.getImageData(0, 0, video.width, video.height);
                const stats = getFrameStats(frame);
                brightnessStats.push(stats);

                if (prevFrame) {
                    const delta = detectMotion(prevFrame, frame);
                    motionLevels.push(delta);
                }

                prevFrame = frame;
                frameCount++;

                if (frameCount < 5) {
                    setTimeout(capture, 500);
                } else {
                    const avgMotion = motionLevels.reduce((a, b) => a + b, 0) / motionLevels.length;
                    const motionVar = Math.sqrt(
                        motionLevels
                            .map((m) => (m - avgMotion) ** 2)
                            .reduce((a, b) => a + b, 0) / motionLevels.length
                    );

                    const avgBrightness = brightnessStats.reduce((a, b) => a + b.avgBrightness, 0) / brightnessStats.length;
                    const avgStdDev = brightnessStats.reduce((a, b) => a + b.brightnessStdDev, 0) / brightnessStats.length;

                    // ✅ Hidden detection (dark, bright, or too uniform)
                    const cameraHidden = avgBrightness < 60 || avgBrightness > 230 || avgStdDev < 15;
                    const motionDetected = avgMotion > 8 && motionVar > 4;

                    cleanup();

                    console.log({
                        avgBrightness,
                        avgStdDev,
                        avgMotion,
                        motionDetected,
                        cameraHidden,
                    });

                    resolve({
                        cameraOn: isCameraActive,
                        motionDetected,
                        cameraHidden,
                        avgBrightness,
                        avgStdDev,
                        avgMotion
                    });
                }
            };

            const cleanup = () => {
                stream.getTracks().forEach((t) => t.stop());
                video.remove();
                canvas.remove();
            };

            capture();
        });

    } catch (err) {
        console.error("Error accessing camera:", err);
        return {
            cameraOn: false,
            motionDetected: false,
            cameraHidden: true,
            error: err.message
        };
    }
}

// export function useCameraMonitor(isStreaming, onWarning, onStop) {
//     const cameraCheckIntervalRef = React.useRef(null);
//     const warningCountRef = React.useRef(0);

//     const startMonitoring = () => {
//         if (cameraCheckIntervalRef.current) {
//             clearInterval(cameraCheckIntervalRef.current);
//         }

//         warningCountRef.current = 0;

//         cameraCheckIntervalRef.current = setInterval(async () => {
//             try {
//                 const cameraStatus = await isCameraOn();

//                 if (!cameraStatus.cameraOn || cameraStatus.cameraHidden || !cameraStatus.motionDetected) {
//                     warningCountRef.current += 1;

//                     if (warningCountRef.current >= 3) {
//                         onStop?.("Camera not detected. Your interview has been interrupted.", true);
//                         return;
//                     }
//                     onWarning?.(warningCountRef.current);
//                 } else {
//                     warningCountRef.current = 0;
//                 }
//             } catch (error) {
//                 console.error("Camera check failed:", error);
//             }
//         }, 30000); 
//     };

//     const stopMonitoring = () => {
//         if (cameraCheckIntervalRef.current) {
//             clearInterval(cameraCheckIntervalRef.current);
//             cameraCheckIntervalRef.current = null;
//         }
//         warningCountRef.current = 0;
//     };

//     React.useEffect(() => {
//         if (isStreaming) {
//             startMonitoring();
//         } else {
//             stopMonitoring();
//         }

//         return () => {
//             stopMonitoring();
//         };
//     }, [isStreaming]);

//     return {
//         stopMonitoring,
//         getWarningCount: () => warningCountRef.current,
//         resetWarningCount: () => { warningCountRef.current = 0; }
//     };
// }

export function useCameraMonitor(isStreaming, onWarning, onStop) {
    const cameraCheckIntervalRef = React.useRef(null);
    const warningShownRef = React.useRef(false);  // only 1 warning allowed

    const startMonitoring = () => {
        if (cameraCheckIntervalRef.current) {
            clearInterval(cameraCheckIntervalRef.current);
        }

        warningShownRef.current = false;

        cameraCheckIntervalRef.current = setInterval(async () => {
            try {
                const cameraStatus = await isCameraOn();

                const cameraIssue =
                    !cameraStatus.cameraOn ||
                    cameraStatus.cameraHidden ||
                    !cameraStatus.motionDetected;

                if (cameraIssue) {
                    if (!warningShownRef.current) {
                        // FIRST TIME → show popup
                        warningShownRef.current = true;
                        onWarning?.(1);
                    } else {
                        // SECOND TIME → REDIRECT
                        onStop?.(
                            "Camera not detected. Your interview has been interrupted.",
                            true
                        );
                    }
                }
            } catch (error) {
                console.error("Camera check failed:", error);
            }
        }, 30000);
    };

    const stopMonitoring = () => {
        if (cameraCheckIntervalRef.current) {
            clearInterval(cameraCheckIntervalRef.current);
            cameraCheckIntervalRef.current = null;
        }
        warningShownRef.current = false;
    };

    React.useEffect(() => {
        if (isStreaming) {
            startMonitoring();
        } else {
            stopMonitoring();
        }

        return () => stopMonitoring();
    }, [isStreaming]);

    return {
        stopMonitoring
    };
}
