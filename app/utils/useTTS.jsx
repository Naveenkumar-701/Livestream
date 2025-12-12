"use client";

import { useState, useCallback } from 'react';
import axios from 'axios';

const getPayload = (text = "", languageCode = "en-US", voiceName = "en-US-Journey-F") => {
    return {
        audioConfig: {
            audioEncoding: "MP3",
            effectsProfileId: ["small-bluetooth-speaker-class-device"],
            pitch: 0,
            speakingRate: 1.0,
        },
        input: {
            text: text,
        },
        voice: {
            languageCode: languageCode,
            name: voiceName,
        },
    };
};

// Google TTS function - NOW TAKES apiKey AS PARAMETER
const speakTextWithGoogle = async (text, apiKey) => {
    if (!apiKey) {
        console.error("Google TTS API key is not configured");
        return null;
    }

    const TTS_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`; // Changed to v1

    try {
        // Truncate very long text to avoid API limits
        const truncatedText = text.length > 5000 ? text.substring(0, 5000) + "..." : text;
        
        const response = await axios.post(
            TTS_URL,
            getPayload(truncatedText),
            {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );
        
        if (response.data && response.data.audioContent) {
            return response.data.audioContent;
        } else {
            console.error("Google TTS Error: No audio content in response");
            return null;
        }
    } catch (error) {
        console.error("Google TTS Error:", error);
        
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
            
            if (error.response.status === 403) {
                console.error("API Key permission error. Check if Text-to-Speech API is enabled.");
            } else if (error.response.status === 400) {
                console.error("Bad request. Check payload format.");
            }
        }
        
        return null;
    }
};

// Fallback to browser speech synthesis (unchanged)
const speakTextWithBrowser = (text) => {
    return new Promise((resolve) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
                voice.lang.includes('en-US') || voice.lang.includes('en-GB')
            );
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            
            utterance.onend = () => {
                resolve(true);
            };
            
            utterance.onerror = (error) => {
                console.error("Speech synthesis error:", error);
                resolve(false);
            };
            
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("Speech synthesis not supported");
            resolve(false);
        }
    });
};

// Play audio from base64 string (unchanged)
const playAudioFromBase64 = (base64Audio) => {
    return new Promise((resolve) => {
        try {
            const audio = new Audio("data:audio/mp3;base64," + base64Audio);
            
            audio.onended = () => {
                resolve(true);
            };
            
            audio.onerror = (error) => {
                console.error("Audio playback error:", error);
                resolve(false);
            };
            
            audio.play().catch(error => {
                console.error("Audio play failed:", error);
                resolve(false);
            });
        } catch (error) {
            console.error("Error creating audio:", error);
            resolve(false);
        }
    });
};

export const useTTS = () => {
    const [isTTSPlaying, setIsTTSPlaying] = useState(false);
    const [isReading, setIsReading] = useState(false);
    const [isQuestionRead, setIsQuestionRead] = useState(false);
    const [useGoogleAPI, setUseGoogleAPI] = useState(true);

    const readQuestionAloud = useCallback(async (questionText) => {
        if (!questionText) return;

        setIsReading(true);
        setIsTTSPlaying(true);
        
        try {
            let success = false;
            
            // Get API key here, inside the callback function
            const apiKey = process.env.NEXT_PUBLIC_VIDEO_API_KEY;
            
            if (useGoogleAPI && apiKey) {
                // Pass apiKey to the function
                const base64Audio = await speakTextWithGoogle(questionText, apiKey);
                if (base64Audio) {
                    success = await playAudioFromBase64(base64Audio);
                }
                
                if (!success) {
                    console.log("Falling back to browser TTS");
                    success = await speakTextWithBrowser(questionText);
                }
            } else {
                success = await speakTextWithBrowser(questionText);
            }
            
            if (success) {
                setIsQuestionRead(true);
            }
        } catch (error) {
            console.error("Error reading question:", error);
            setIsQuestionRead(true);
        } finally {
            setIsTTSPlaying(false);
            setIsReading(false);
        }
    }, [useGoogleAPI]);

    const resetQuestionRead = useCallback(() => {
        setIsQuestionRead(false);
        setIsTTSPlaying(false);
        setIsReading(false);
    }, []);

    const stopTTS = useCallback(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        
        setIsTTSPlaying(false);
        setIsReading(false);
    }, []);

    const toggleGoogleAPI = useCallback(() => {
        setUseGoogleAPI(prev => !prev);
        console.log(`Google TTS API ${!useGoogleAPI ? 'enabled' : 'disabled'}`);
    }, [useGoogleAPI]);

    return {
        isTTSPlaying,
        isReading,
        isQuestionRead,
        readQuestionAloud,
        resetQuestionRead,
        stopTTS,
        useGoogleAPI,
        toggleGoogleAPI
    };
};


