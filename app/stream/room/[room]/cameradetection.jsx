// "use client";
// import React, { useEffect, useRef } from "react";

// export default function CameraDetection({
//     questions,
//     qIndex,
//     theoryCameraRef,
//     programmingCameraRef,
//     setCameraAlert,
//     setDetectionActive,
//     isStreaming,
//     showQuestions,
// }) {
//     const detectionIntervalRef = useRef(null);
//     const canvasRef = useRef(null);
//     const alertCooldownRef = useRef(false);
//     const noPersonCounterRef = useRef(0);
//     const multiplePersonCounterRef = useRef(0);
//     const lastDetectionResultRef = useRef("normal");

//     useEffect(() => {
//         // Stop detection when not streaming or no questions
//         if (!isStreaming || !showQuestions) {
//             if (detectionIntervalRef.current) {
//                 clearInterval(detectionIntervalRef.current);
//                 detectionIntervalRef.current = null;
//             }
//             setDetectionActive(false);
//             console.log("🎯 Camera detection stopped");
//             return;
//         }

//         const currentCameraRef =
//             questions[qIndex].type === "programming"
//                 ? programmingCameraRef
//                 : theoryCameraRef;

//         if (!currentCameraRef?.current) {
//             console.log("🎯 Camera element not ready for detection");
//             return;
//         }

//         console.log("🎯 Starting improved camera detection...");
//         setDetectionActive(true);

//         const canvas = document.createElement("canvas");
//         const ctx = canvas.getContext("2d", { willReadFrequently: true });
//         canvasRef.current = { canvas, ctx };

//         noPersonCounterRef.current = 0;
//         multiplePersonCounterRef.current = 0;
//         lastDetectionResultRef.current = "normal";

//         const detect = () => {
//             detectCameraIssues({
//                 questions,
//                 qIndex,
//                 theoryCameraRef,
//                 programmingCameraRef,
//                 canvasRef,
//                 setCameraAlert,
//                 alertCooldownRef,
//                 noPersonCounterRef,
//                 multiplePersonCounterRef,
//                 lastDetectionResultRef,
//             });
//         };

//         // Run once immediately, then every 3s
//         detect();
//         detectionIntervalRef.current = setInterval(detect, 3000);

//         return () => {
//             if (detectionIntervalRef.current) {
//                 clearInterval(detectionIntervalRef.current);
//                 detectionIntervalRef.current = null;
//             }
//             setDetectionActive(false);
//             console.log("🎯 Camera detection stopped");
//         };
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [
//         qIndex,
//         isStreaming,
//         showQuestions,
//         questions,
//         theoryCameraRef,
//         programmingCameraRef,
//         setCameraAlert,
//         setDetectionActive,
//     ]);

//     return null;
// }

// function detectCameraIssues({
//     questions,
//     qIndex,
//     theoryCameraRef,
//     programmingCameraRef,
//     canvasRef,
//     setCameraAlert,
//     alertCooldownRef,
//     noPersonCounterRef,
//     multiplePersonCounterRef,
//     lastDetectionResultRef,
// }) {
//     const currentCameraRef =
//         questions[qIndex].type === "programming"
//             ? programmingCameraRef
//             : theoryCameraRef;

//     const video = currentCameraRef.current?.querySelector("video");
//     if (!video) {
//         console.log("🎯 Video element not found in camera container");
//         return;
//     }

//     if (video.readyState !== HTMLMediaElement.HAVE_ENOUGH_DATA) {
//         console.log("🎯 Video not ready for detection");
//         return;
//     }

//     if (video.videoWidth === 0 || video.videoHeight === 0) {
//         console.log("🎯 Video dimensions are zero");
//         return;
//     }

//     try {
//         const { canvas, ctx } = canvasRef.current;
//         canvas.width = 160;
//         canvas.height = 120;

//         ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
//         const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);

//         // Enhanced screen share detection
//         if (isScreenShare(frameData)) {
//             console.log("🎯 Detected screen share - skipping person detection");
//             noPersonCounterRef.current = 0;
//             multiplePersonCounterRef.current = 0;
//             // Clear alert if any
//             setCameraAlert({ open: false, message: "" });
//             return;
//         }

//         const personCount = countPersons(frameData);
//         console.log(
//             "🎯 Persons detected:",
//             personCount,
//             "No-person counter:",
//             noPersonCounterRef.current,
//             "Multi-person counter:",
//             multiplePersonCounterRef.current
//         );

//         if (personCount === 0) {
//             noPersonCounterRef.current++;
//             multiplePersonCounterRef.current = 0;

//             if (
//                 noPersonCounterRef.current >= 2 &&
//                 lastDetectionResultRef.current !== "no_person"
//             ) {
//                 console.log("🎯 Triggering no person alert");
//                 showCameraAlert(
//                     setCameraAlert,
//                     alertCooldownRef,
//                     "No one detected in camera frame. Please position yourself in front of the camera."
//                 );
//                 lastDetectionResultRef.current = "no_person";
//             }
//         } else if (personCount >= 2) {
//             multiplePersonCounterRef.current++;
//             noPersonCounterRef.current = 0;

//             if (
//                 multiplePersonCounterRef.current >= 2 &&
//                 lastDetectionResultRef.current !== "multiple_persons"
//             ) {
//                 console.log("🎯 Triggering multiple person alert");
//                 showCameraAlert(
//                     setCameraAlert,
//                     alertCooldownRef,
//                     "More than one person detected in camera! Please ensure you are alone during the interview."
//                 );
//                 lastDetectionResultRef.current = "multiple_persons";
//             }
//         } else {
//             // Person count is 1 - normal condition
//             noPersonCounterRef.current = 0;
//             multiplePersonCounterRef.current = 0;

//             if (lastDetectionResultRef.current !== "normal") {
//                 console.log("🎯 Conditions normal - clearing alert");
//                 setCameraAlert({ open: false, message: "" });
//                 lastDetectionResultRef.current = "normal";
//             }
//         }
//     } catch (error) {
//         console.error("Camera detection error:", error);
//     }
// }

// function countPersons(frameData) {
//     const data = frameData.data;
//     const width = frameData.width;
//     const height = frameData.height;

//     const skinPixels = [];

//     const gridSize = 3;
//     for (let y = 0; y < height; y += gridSize) {
//         for (let x = 0; x < width; x += gridSize) {
//             const idx = (y * width + x) * 4;
//             const r = data[idx];
//             const g = data[idx + 1];
//             const b = data[idx + 2];

//             if (isSkinTone(r, g, b)) {
//                 skinPixels.push({ x, y });
//             }
//         }
//     }

//     console.log("🎯 Total skin pixels found:", skinPixels.length);

//     const pixelThreshold = Math.floor((width * height) / 500);
//     if (skinPixels.length < pixelThreshold) {
//         return 0;
//     }

//     const clusters = [];
//     const visited = new Set();
//     const clusterDistance = 20;

//     for (let i = 0; i < skinPixels.length; i++) {
//         if (visited.has(i)) continue;

//         const cluster = [skinPixels[i]];
//         visited.add(i);
//         const queue = [i];

//         while (queue.length > 0) {
//             const currentIdx = queue.shift();
//             const currentPixel = skinPixels[currentIdx];

//             for (let j = 0; j < skinPixels.length; j++) {
//                 if (visited.has(j)) continue;

//                 const otherPixel = skinPixels[j];
//                 const distance = Math.sqrt(
//                     Math.pow(currentPixel.x - otherPixel.x, 2) +
//                         Math.pow(currentPixel.y - otherPixel.y, 2)
//                 );

//                 if (distance < clusterDistance) {
//                     cluster.push(otherPixel);
//                     visited.add(j);
//                     queue.push(j);
//                 }
//             }
//         }

//         if (cluster.length > 10) {
//             clusters.push(cluster);
//         }
//     }

//     return clusters.length;
// }

// function isSkinTone(r, g, b) {
//     const rgbConstraints =
//         r > 80 &&
//         g > 30 &&
//         b > 15 &&
//         r > g &&
//         r > b &&
//         Math.abs(r - g) > 10 &&
//         r < 250 &&
//         g < 250 &&
//         b < 250;

//     if (!rgbConstraints) return false;

//     const brightness = (r + g + b) / 3;
//     const maxColor = Math.max(r, g, b);
//     const minColor = Math.min(r, g, b);
//     const colorDiff = maxColor - minColor;

//     const notTooDark = brightness > 80;
//     const notTooBright = brightness < 240;
//     const hasGoodRange = colorDiff > 15;

//     const isSkinLike =
//         r > 95 &&
//         g > 40 &&
//         b > 20 &&
//         Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
//         Math.abs(r - g) > 15;

//     return notTooDark && notTooBright && hasGoodRange && isSkinLike;
// }

// function isScreenShare(frameData) {
//     const data = frameData.data;
//     const width = frameData.width;
//     const height = frameData.height;

//     let totalBrightness = 0;
//     let uniformCount = 0;
//     let sampleCount = 0;
//     let edgeCount = 0;

//     for (let y = 0; y < height; y += 4) {
//         for (let x = 0; x < width; x += 4) {
//             const idx = (y * width + x) * 4;
//             const r = data[idx];
//             const g = data[idx + 1];
//             const b = data[idx + 2];
//             const brightness = (r + g + b) / 3;
//             totalBrightness += brightness;
//             sampleCount++;

//             if (x < width - 4 && y < height - 4) {
//                 const rightIdx = (y * width + (x + 4)) * 4;
//                 const rightBrightness =
//                     (data[rightIdx] +
//                         data[rightIdx + 1] +
//                         data[rightIdx + 2]) /
//                     3;
//                 const bottomIdx = ((y + 4) * width + x) * 4;
//                 const bottomBrightness =
//                     (data[bottomIdx] +
//                         data[bottomIdx + 1] +
//                         data[bottomIdx + 2]) /
//                     3;

//                 if (Math.abs(brightness - rightBrightness) > 30) edgeCount++;
//                 if (Math.abs(brightness - bottomBrightness) > 30) edgeCount++;

//                 if (Math.abs(brightness - rightBrightness) < 5) {
//                     uniformCount++;
//                 }
//             }
//         }
//     }

//     const avgBrightness = totalBrightness / sampleCount;
//     const uniformRatio = uniformCount / (sampleCount * 2);
//     const edgeRatio = edgeCount / (sampleCount * 2);

//     return avgBrightness > 200 || uniformRatio > 0.7 || edgeRatio < 0.1;
// }

// function showCameraAlert(setCameraAlert, alertCooldownRef, message) {
//     if (alertCooldownRef.current) {
//         console.log("🎯 Alert cooldown active, skipping");
//         return;
//     }

//     console.log("🎯 Showing camera alert:", message);
//     setCameraAlert({ open: true, message });
//     alertCooldownRef.current = true;

//     setTimeout(() => {
//         alertCooldownRef.current = false;
//         console.log("🎯 Alert cooldown ended");
//     }, 10000);
// }






"use client";
import React, { useEffect, useRef } from "react";

export default function CameraDetection({
    questions,
    qIndex,
    theoryCameraRef,
    programmingCameraRef,
    setCameraAlert,
    setDetectionActive,
    isStreaming,
    showQuestions,
}) {
    const detectionIntervalRef = useRef(null);
    const canvasRef = useRef(null);
    const alertCooldownRef = useRef(false);
    const noPersonCounterRef = useRef(0);
    const multiplePersonCounterRef = useRef(0);
    const lastDetectionResultRef = useRef("normal");

    useEffect(() => {
        // Stop detection when not streaming or no questions
        if (!isStreaming || !showQuestions) {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
                detectionIntervalRef.current = null;
            }
            setDetectionActive(false);
            console.log("🎯 Camera detection stopped");
            return;
        }

        const currentCameraRef =
            questions[qIndex].type === "programming"
                ? programmingCameraRef
                : theoryCameraRef;

        if (!currentCameraRef?.current) {
            console.log("🎯 Camera element not ready for detection");
            return;
        }

        console.log("🎯 Starting improved camera detection...");
        setDetectionActive(true);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        canvasRef.current = { canvas, ctx };

        noPersonCounterRef.current = 0;
        multiplePersonCounterRef.current = 0;
        lastDetectionResultRef.current = "normal";

        const detect = () => {
            detectCameraIssues({
                questions,
                qIndex,
                theoryCameraRef,
                programmingCameraRef,
                canvasRef,
                setCameraAlert,
                alertCooldownRef,
                noPersonCounterRef,
                multiplePersonCounterRef,
                lastDetectionResultRef,
            });
        };

        // Run once immediately, then every 3s
        detect();
        detectionIntervalRef.current = setInterval(detect, 3000);

        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
                detectionIntervalRef.current = null;
            }
            setDetectionActive(false);
            console.log("🎯 Camera detection stopped");
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        qIndex,
        isStreaming,
        showQuestions,
        questions,
        theoryCameraRef,
        programmingCameraRef,
        setCameraAlert,
        setDetectionActive,
    ]);

    return null;
}

function detectCameraIssues({
    questions,
    qIndex,
    theoryCameraRef,
    programmingCameraRef,
    canvasRef,
    setCameraAlert,
    alertCooldownRef,
    noPersonCounterRef,
    multiplePersonCounterRef,
    lastDetectionResultRef,
}) {
    const currentCameraRef =
        questions[qIndex].type === "programming"
            ? programmingCameraRef
            : theoryCameraRef;

    const video = currentCameraRef.current?.querySelector("video");
    if (!video) {
        console.log("🎯 Video element not found in camera container");
        return;
    }

    if (video.readyState !== HTMLMediaElement.HAVE_ENOUGH_DATA) {
        console.log("🎯 Video not ready for detection");
        return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log("🎯 Video dimensions are zero");
        return;
    }

    try {
        const { canvas, ctx } = canvasRef.current;
        canvas.width = 160;
        canvas.height = 120;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // ❌ OLD: this was blocking all detection for bright frames
        // if (isScreenShare(frameData)) {
        //     console.log("🎯 Detected screen share - skipping person detection");
        //     noPersonCounterRef.current = 0;
        //     multiplePersonCounterRef.current = 0;
        //     setCameraAlert({ open: false, message: "" });
        //     return;
        // }

        const personCount = countPersons(frameData);
        console.log(
            "🎯 Persons detected:",
            personCount,
            "No-person counter:",
            noPersonCounterRef.current,
            "Multi-person counter:",
            multiplePersonCounterRef.current
        );

        if (personCount === 0) {
            noPersonCounterRef.current++;
            multiplePersonCounterRef.current = 0;

            if (
                noPersonCounterRef.current >= 2 &&
                lastDetectionResultRef.current !== "no_person"
            ) {
                console.log("🎯 Triggering no person alert");
                showCameraAlert(
                    setCameraAlert,
                    alertCooldownRef,
                    "No one detected in camera frame. Please position yourself in front of the camera."
                );
                lastDetectionResultRef.current = "no_person";
            }
        } else if (personCount >= 2) {
            multiplePersonCounterRef.current++;
            noPersonCounterRef.current = 0;

            if (
                multiplePersonCounterRef.current >= 2 &&
                lastDetectionResultRef.current !== "multiple_persons"
            ) {
                console.log("🎯 Triggering multiple person alert");
                showCameraAlert(
                    setCameraAlert,
                    alertCooldownRef,
                    "More than one person detected in camera! Please ensure you are alone during the interview."
                );
                lastDetectionResultRef.current = "multiple_persons";
            }
        } else {
            // Person count is 1 - normal condition
            noPersonCounterRef.current = 0;
            multiplePersonCounterRef.current = 0;

            if (lastDetectionResultRef.current !== "normal") {
                console.log("🎯 Conditions normal - clearing alert");
                setCameraAlert({ open: false, message: "" });
                lastDetectionResultRef.current = "normal";
            }
        }
    } catch (error) {
        console.error("Camera detection error:", error);
    }
}

function countPersons(frameData) {
    const data = frameData.data;
    const width = frameData.width;
    const height = frameData.height;

    const skinPixels = [];

    const gridSize = 3;
    for (let y = 0; y < height; y += gridSize) {
        for (let x = 0; x < width; x += gridSize) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            if (isSkinTone(r, g, b)) {
                skinPixels.push({ x, y });
            }
        }
    }

    console.log("🎯 Total skin pixels found:", skinPixels.length);

    const pixelThreshold = Math.floor((width * height) / 500);
    if (skinPixels.length < pixelThreshold) {
        return 0;
    }

    const clusters = [];
    const visited = new Set();
    const clusterDistance = 20;

    for (let i = 0; i < skinPixels.length; i++) {
        if (visited.has(i)) continue;

        const cluster = [skinPixels[i]];
        visited.add(i);
        const queue = [i];

        while (queue.length > 0) {
            const currentIdx = queue.shift();
            const currentPixel = skinPixels[currentIdx];

            for (let j = 0; j < skinPixels.length; j++) {
                if (visited.has(j)) continue;

                const otherPixel = skinPixels[j];
                const distance = Math.sqrt(
                    Math.pow(currentPixel.x - otherPixel.x, 2) +
                        Math.pow(currentPixel.y - otherPixel.y, 2)
                );

                if (distance < clusterDistance) {
                    cluster.push(otherPixel);
                    visited.add(j);
                    queue.push(j);
                }
            }
        }

        if (cluster.length > 10) {
            clusters.push(cluster);
        }
    }

    return clusters.length;
}

function isSkinTone(r, g, b) {
    const rgbConstraints =
        r > 80 &&
        g > 30 &&
        b > 15 &&
        r > g &&
        r > b &&
        Math.abs(r - g) > 10 &&
        r < 250 &&
        g < 250 &&
        b < 250;

    if (!rgbConstraints) return false;

    const brightness = (r + g + b) / 3;
    const maxColor = Math.max(r, g, b);
    const minColor = Math.min(r, g, b);
    const colorDiff = maxColor - minColor;

    const notTooDark = brightness > 80;
    const notTooBright = brightness < 240;
    const hasGoodRange = colorDiff > 15;

    const isSkinLike =
        r > 95 &&
        g > 40 &&
        b > 20 &&
        Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
        Math.abs(r - g) > 15;

    return notTooDark && notTooBright && hasGoodRange && isSkinLike;
}

// Keeping this in case you want to re-use it later for actual screen stream
function isScreenShare(frameData) {
    const data = frameData.data;
    const width = frameData.width;
    const height = frameData.height;

    let totalBrightness = 0;
    let uniformCount = 0;
    let sampleCount = 0;
    let edgeCount = 0;

    for (let y = 0; y < height; y += 4) {
        for (let x = 0; x < width; x += 4) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r + g + b) / 3;
            totalBrightness += brightness;
            sampleCount++;

            if (x < width - 4 && y < height - 4) {
                const rightIdx = (y * width + (x + 4)) * 4;
                const rightBrightness =
                    (data[rightIdx] +
                        data[rightIdx + 1] +
                        data[rightIdx + 2]) /
                    3;
                const bottomIdx = ((y + 4) * width + x) * 4;
                const bottomBrightness =
                    (data[bottomIdx] +
                        data[bottomIdx + 1] +
                        data[bottomIdx + 2]) /
                    3;

                if (Math.abs(brightness - rightBrightness) > 30) edgeCount++;
                if (Math.abs(brightness - bottomBrightness) > 30) edgeCount++;

                if (Math.abs(brightness - rightBrightness) < 5) {
                    uniformCount++;
                }
            }
        }
    }

    const avgBrightness = totalBrightness / sampleCount;
    const uniformRatio = uniformCount / (sampleCount * 2);
    const edgeRatio = edgeCount / (sampleCount * 2);

    return avgBrightness > 200 || uniformRatio > 0.7 || edgeRatio < 0.1;
}

function showCameraAlert(setCameraAlert, alertCooldownRef, message) {
    if (alertCooldownRef.current) {
        console.log("🎯 Alert cooldown active, skipping");
        return;
    }

    console.log("🎯 Showing camera alert:", message);
    setCameraAlert({ open: true, message });
    alertCooldownRef.current = true;

    setTimeout(() => {
        alertCooldownRef.current = false;
        console.log("🎯 Alert cooldown ended");
    }, 10000);
}
