import { useEffect, useRef } from "react";

const TAB_SWITCH_THRESHOLD = 800;

const useTabSwitchGuard = ({
    enabled,
    isStreaming,
    onViolation, // ✅ callback from LiveRoom
}) => {
    const lastBlurTimeRef = useRef(0);
    const triggeredRef = useRef(false);

    useEffect(() => {
        if (!enabled || !isStreaming) return;

        const handleWindowBlur = () => {
            lastBlurTimeRef.current = Date.now();
        };

        const handleVisibilityChange = () => {
            if (triggeredRef.current) return;
            if (!document.hidden) return;

            const now = Date.now();
            const diff = now - lastBlurTimeRef.current;

            // ✅ Ignore alerts / modals
            if (diff < TAB_SWITCH_THRESHOLD) return;

            // ✅ REAL TAB SWITCH
            triggeredRef.current = true;

            console.warn("🚫 TAB / WINDOW SWITCH VIOLATION");

            if (typeof onViolation === "function") {
                onViolation();
            }
        };

        window.addEventListener("blur", handleWindowBlur);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("blur", handleWindowBlur);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [enabled, isStreaming, onViolation]);
};

export default useTabSwitchGuard;
