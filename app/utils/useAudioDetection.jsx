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
            
            if (timeSinceLastVoice >= 20000) { // 10 seconds
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
