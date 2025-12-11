// import { useEffect, useRef, useState } from "react";

// export default function useDeepgramSTT(isStreaming) {
//     const [transcript, setTranscript] = useState("");
//     const [listening, setListening] = useState(false);

//     const socketRef = useRef(null);
//     const recorderRef = useRef(null);

//     useEffect(() => {
//         if (!isStreaming) return;

//         setListening(true);

//         const socket = new WebSocket("ws://localhost:5000/stt");
//         socketRef.current = socket;

//         socket.onmessage = (e) => {
//             const data = JSON.parse(e.data);


//             if (data.transcript && data.isFinal) {
//                 setTranscript((prev) =>
//                     prev + (prev ? " " : "") + data.transcript
//                 );
//             }
//         };

//         socket.onopen = () => {
//             navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
//                 const recorder = new MediaRecorder(stream, {
//                     mimeType: "audio/webm",
//                 });

//                 recorderRef.current = recorder;

//                 recorder.ondataavailable = (e) => {
//                     if (socket.readyState === WebSocket.OPEN) {
//                         socket.send(e.data);
//                     }
//                 };

//                 recorder.start(250);
//             });
//         };


//         return () => {
//             setListening(false);
//             recorderRef.current?.stop();
//             socketRef.current?.close();
//         };
//     }, [isStreaming]);

//     return {
//         transcript,
//         resetTranscript: () => setTranscript(""),
//         listening, // ✅ REQUIRED FOR YOUR PAGE
//     };
// }






import { useEffect, useRef, useState } from "react";

/**
 * Deepgram Speech-to-Text Hook
 * - Reuses microphone stream from LiveRoom
 * - Does NOT call getUserMedia
 * - Accumulates interim + final transcripts
 */
export default function useDeepgramSTT(isStreaming, micStreamRef) {
    const [transcript, setTranscript] = useState("");
    const [listening, setListening] = useState(false);

    const socketRef = useRef(null);
    const audioCtxRef = useRef(null);
    const processorRef = useRef(null);
    const interimRef = useRef(""); // ✅ holds interim words

    useEffect(() => {
        if (!isStreaming || !micStreamRef?.current) {
            setListening(false);
            return;
        }

        console.log("🚀 Initializing Deepgram STT…");
        setListening(true);

        const socket = new WebSocket("ws://localhost:5000/stt");
        socket.binaryType = "arraybuffer";
        socketRef.current = socket;

        socket.onopen = async () => {
            console.log("✅ Deepgram WebSocket Connected");

            const stream = micStreamRef.current;
            if (!stream) {
                console.error("❌ Mic stream not available");
                return;
            }

            const audioCtx = new AudioContext({ sampleRate: 16000 });
            audioCtxRef.current = audioCtx;

            if (audioCtx.state === "suspended") {
                await audioCtx.resume();
            }

            console.log("🎤 Mic sample rate:", audioCtx.sampleRate);

            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(2048, 1, 1);
            processorRef.current = processor;

            source.connect(processor);
            processor.connect(audioCtx.destination);

            // ✅ Send PCM16 audio
            processor.onaudioprocess = (e) => {
                if (socket.readyState !== WebSocket.OPEN) return;

                const input = e.inputBuffer.getChannelData(0);
                const pcm16 = new Int16Array(input.length);

                for (let i = 0; i < input.length; i++) {
                    const s = Math.max(-1, Math.min(1, input[i]));
                    pcm16[i] = s * 0x7fff;
                }

                socket.send(pcm16.buffer);
            };
        };

        // ✅ HANDLE INTERIM + FINAL TRANSCRIPTS
        socket.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (!data.transcript) return;

                if (data.isFinal) {
                    // ✅ commit final transcript
                    setTranscript(prev =>
                        prev
                            ? prev + " " + data.transcript
                            : data.transcript
                    );
                    interimRef.current = ""; // clear interim
                } else {
                    // ✅ store interim (not committed yet)
                    interimRef.current = data.transcript;
                }
            } catch (err) {
                console.error("❌ DG parse error:", err);
            }
        };

        socket.onerror = (err) => {
            console.error("❌ Deepgram WebSocket error:", err);
        };

        // ✅ CLEANUP
        return () => {
            console.log("🛑 Cleaning up Deepgram STT");

            setListening(false);
            interimRef.current = "";

            if (processorRef.current) {
                processorRef.current.disconnect();
                processorRef.current.onaudioprocess = null;
                processorRef.current = null;
            }

            if (audioCtxRef.current) {
                audioCtxRef.current.close();
                audioCtxRef.current = null;
            }

            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [isStreaming]);

    return {
        transcript,
        listening,

        // ✅ reset between questions
        resetTranscript: () => {
            console.log("🔄 Transcript reset");
            setTranscript("");
            interimRef.current = "";
        },

        // ✅ OPTIONAL: live text if you want UI typing effect
        liveTranscript: interimRef.current
            ? transcript + " " + interimRef.current
            : transcript,
    };
}




//  import { useEffect, useRef, useState } from "react";

// export default function useDeepgramSTT(isStreaming) {
//     const [transcript, setTranscript] = useState("");
//     const socketRef = useRef(null);
//     const recorderRef = useRef(null);

//     useEffect(() => {
//         if (!isStreaming) return;

//         // ✅ Connect to backend WebSocket
//         const socket = new WebSocket("ws://localhost:5000/stt");
//         socketRef.current = socket;

//         // socket.onmessage = (event) => {
//         //     const data = JSON.parse(event.data);
//         //     if (data.transcript) {
//         //         setTranscript((prev) => prev + " " + data.transcript);
//         //     }
//         // };

//         socket.onmessage = (e) => {
//             const data = JSON.parse(e.data);

//             if (data.transcript && data.isFinal) {
//                 setTranscript((prev) =>
//                     prev.endsWith(data.transcript)
//                         ? prev
//                         : prev + " " + data.transcript
//                 );
//             }
//         };


//         navigator.mediaDevices
//             .getUserMedia({ audio: true })
//             .then((stream) => {
//                 const recorder = new MediaRecorder(stream, {
//                     mimeType: "audio/webm",
//                 });

//                 recorderRef.current = recorder;

//                 recorder.ondataavailable = (e) => {
//                     if (socket.readyState === WebSocket.OPEN) {
//                         socket.send(e.data);
//                     }
//                 };

//                 recorder.start(250); // send audio every 250ms
//             });

//         return () => {
//             recorderRef.current?.stop();
//             socketRef.current?.close();
//         };
//     }, [isStreaming]);

//     return {
//         transcript,
//         resetTranscript: () => setTranscript(""),
//     };
// }