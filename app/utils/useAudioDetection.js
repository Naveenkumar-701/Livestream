// "use client";

// import { useState, useEffect, useRef } from 'react';

// const useAudioDetection = (listening, isTTSPlaying = false) => {
//     const [isMuted, setIsMuted] = useState(false);
//     const silenceTimeoutRef = useRef(null);
//     const lastVoiceTimeRef = useRef(null);

//     useEffect(() => {
//         if (!listening) {
//             setIsMuted(false);
//             if (silenceTimeoutRef.current) {
//                 clearTimeout(silenceTimeoutRef.current);
//             }
//             return;
//         }

//         // Reset voice detection when listening starts
//         lastVoiceTimeRef.current = Date.now();

//         // Function to check for silence
//         const checkSilence = () => {
//             // Don't check while TTS is playing - candidate is listening, not speaking
//             if (!listening || isTTSPlaying) {
//                 setIsMuted(false);
//                 return;
//             }
            
//             const now = Date.now();
//             const timeSinceLastVoice = now - lastVoiceTimeRef.current;
            
//             // If no voice detected for 10 seconds
//             if (timeSinceLastVoice >= 10000) {
//                 setIsMuted(true);
//             } else {
//                 setIsMuted(false);
//             }
//         };

//         // Check for silence every second
//         silenceTimeoutRef.current = setInterval(checkSilence, 1000);

//         return () => {
//             if (silenceTimeoutRef.current) {
//                 clearInterval(silenceTimeoutRef.current);
//             }
//         };
//     }, [listening, isTTSPlaying]);

//     // Function to reset mute detection (call when user speaks)
//     const resetMuteDetection = () => {
//         lastVoiceTimeRef.current = Date.now();
//         setIsMuted(false);
//     };

//     return { isMuted, resetMuteDetection };
// };

// export default useAudioDetection;



"use client";

import { useState, useEffect, useRef } from 'react';

const useAudioDetection = (listening, isTTSPlaying = false) => {
    const [isMuted, setIsMuted] = useState(false);
    const silenceTimeoutRef = useRef(null);
    const lastVoiceTimeRef = useRef(null);
    const intervalRef = useRef(null);

    const resetMuteDetection = () => {
        lastVoiceTimeRef.current = Date.now();
        setIsMuted(false);
    };

    useEffect(() => {
        if (!listening) {
            setIsMuted(false);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Initialize last voice time
        lastVoiceTimeRef.current = Date.now();
        setIsMuted(false);

        const checkSilence = () => {
            if (!listening || isTTSPlaying) {
                setIsMuted(false);
                return;
            }
            
            const now = Date.now();
            const timeSinceLastVoice = now - lastVoiceTimeRef.current;
            
            if (timeSinceLastVoice >= 10000) { // 10 seconds
                setIsMuted(true);
            } else {
                setIsMuted(false);
            }
        };

        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Start checking every second
        intervalRef.current = setInterval(checkSilence, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [listening, isTTSPlaying]);

    return { isMuted, resetMuteDetection };
};

export default useAudioDetection;