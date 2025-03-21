'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { questions } from '@/data/questions';
import { calculateSimilarity } from '@/utils/similarity';
import DisableDevtool from 'disable-devtool';
import { Timer } from '@/components/Timer';
import { logout } from '@/actions/logout';
import { useRouter } from 'next/navigation';
import KeystrokeAnalytics from '@/components/Keystroke';
import MouseMovementAnalyzer from '@/components/MouseTracker';
import Link from 'next/link';

export default function Page() {
    const router = useRouter();
    const [answers, setAnswers] = useState<{ [key: number]: string }>({});
    const [results, setResults] = useState<{ [key: number]: boolean }>({});
    const [showResults, setShowResults] = useState(false);
    const [attempted, setAttempted] = useState(false);
    const [showPasteWarning, setShowPasteWarning] = useState(false);
    const [showDevToolsWarning, setShowDevToolsWarning] = useState(false);
    const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);
    const [showBotWarning, setShowBotWarning] = useState(false);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [showVerificationWarning, setShowVerificationWarning] = useState(false);
    const [randomizedQuestions, setRandomizedQuestions] = useState(questions);
    const [mounted, setMounted] = useState(false);
    const [pasteCount, setPasteCount] = useState(0);
    const [submitted, setSubmitted] = useState(false)

    const handlePasteAttempt = useCallback(() => {
        setPasteCount((prev) => {
            const newCount = prev + 1;
            if (newCount >= 3) {
                setShowPasteWarning(true);
                setTimeout(() => {
                    setShowPasteWarning(false);
                    setPasteCount(0);
                    setTabSwitchCount((prev) => prev + 1);
                }, 3000);
                return 0;
            }
            setShowPasteWarning(true);
            setTimeout(() => setShowPasteWarning(false), 3000);
            return newCount;
        });
    }, []);

    const handleVerificationFailed = useCallback(() => {
        setShowVerificationWarning(true);
        setTabSwitchCount((prev) => prev + 3);
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        setRandomizedQuestions(shuffled);
        setTimeout(() => setShowVerificationWarning(false), 3000);
    }, []);

    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () =>
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const enterFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
        } catch (err) {
            console.error("Error attempting to enable fullscreen:", err);
        }
    };

    useEffect(() => {
        sessionStorage.setItem("tabSwitch", String(tabSwitchCount));
        if (tabSwitchCount >= 10) {
            // logout("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
            router.push("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
        }
    }, [tabSwitchCount]);

    useEffect(() => {
        const t = sessionStorage.getItem("tabSwitch");
        if (t) setTabSwitchCount(t ? parseInt(t) : 0);

        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        setRandomizedQuestions(shuffled);

        DisableDevtool();
        setMounted(true);

        const handleDevTools = () => {
            setShowDevToolsWarning(true);
            setTimeout(() => setShowDevToolsWarning(false), 3000);
        };

        const handleContextMenu = (e: Event) => {
            e.preventDefault();
            handleDevTools();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                (e.ctrlKey &&
                    e.shiftKey &&
                    (e.key === "I" || e.key === "J" || e.key === "C")) ||
                (e.metaKey && e.altKey && e.key === "I") ||
                e.key === "F12"
            ) {
                e.preventDefault();
                handleDevTools();
            }
        };

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            setPasteCount((prev) => prev + 1);
        };

        const detectDevTools = () => {
            if (
                window.outerWidth - window.innerWidth > 160 ||
                window.outerHeight - window.innerHeight > 160
            ) {
                handleDevTools();
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitchCount((prev) => prev + 2);
                setShowTabSwitchWarning(true);
                setTimeout(() => setShowTabSwitchWarning(false), 3000);
            }
        };

        document.addEventListener("paste", handlePaste);
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("keydown", handleKeyDown);
        window.addEventListener("resize", detectDevTools);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        setInterval(detectDevTools, 1000);

        return () => {
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("resize", detectDevTools);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    const isAllAnswered = () => {
        return randomizedQuestions.every((question) =>
            answers[question.id]?.trim()
        );
    };

    const handleSubmitAll = () => {
        if (!isAllAnswered()) {
            setAttempted(true);
            return;
        }
        setSubmitted(true);
        const newResults = {};
        randomizedQuestions.forEach((question) => {
            const answer = answers[question.id] || "";
            let isCorrect = false;
            if (question.type === "mcq") {
                isCorrect = answer === question.correctAnswer;
            } else {
                isCorrect =
                    calculateSimilarity(answer, question.correctAnswer) >=
                    (question.similarityThreshold || 0.9);
            }
            (newResults as any)[question.id] = isCorrect;
        });
        setResults(newResults);
        setShowResults(true);
    };
    const handleValidityChange = (isValid: boolean, confidence: number) => {
        // setValidMovement(isValid);
        // setConfidenceScore(confidence);

        if (!isValid && confidence < 0.4) {
            console.log('Potentially malicious activity detected');
            setShowBotWarning(true);
            setTimeout(() => setShowBotWarning(false), 3000);
        }
    };


    return isFullscreen ? (
        <div className='flex flex-col h-full max-w-screen-xl w-full pl-[20vw] px-24 py-16 overflow-auto'>
            <MouseMovementAnalyzer onValidityChange={handleValidityChange} sensitivityLevel={0.7}>
                <Timer onVerificationFailed={handleVerificationFailed} />
                <h1 className='text-3xl font-semibold text-white'>Questions</h1>
                <div className='space-y-8 mt-6'>
                    {mounted ? randomizedQuestions.map(question => (
                        <div key={question.id} className={`p-6 rounded-lg`}>
                            <p className='text-white mb-4 font-medium text-lg select-none'>{question.question}</p>
                            {question.type === 'mcq' ? (
                                <div className='space-y-2 border-l border-white/30 pl-2 ml-2'>
                                    {question.options?.map(option => (
                                        <button
                                            key={option}
                                            className={`text-left min-w-[500px] text-white font-medium w-fit p-2 px-4 flex gap-3 items-center rounded-full ${answers[question.id] === option ? (showResults ? (results[question.id] ? 'bg-green-500/50' : 'bg-red-500/50') : 'bg-blue-500/50') : ''}`}
                                            onClick={() => setAnswers(prev => ({ ...prev, [question.id]: option }))}
                                            disabled={showResults}
                                        >
                                            <div className={`${answers[question.id] === option ? (showResults ? (results[question.id] ? 'bg-green-300 border-green-700' : 'bg-red-300 border-red-700') : 'bg-blue-300 border-blue-700') : 'bg-transparent border-white'} w-4 h-4 rounded-full border-2`} />{option}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div>

                                    <KeystrokeAnalytics setTabSwitchCount={setTabSwitchCount} results={results} setAnswers={setAnswers} showResults={showResults} question={question} answers={answers} handlePasteAttempt={handlePasteAttempt} />
                                </div>
                            )}
                        </div>
                    )) : null}
                </div>
                <div className='fixed bottom-8 right-8 flex flex-col items-end gap-2'>
                    {showVerificationWarning && (
                        <div className="bg-red-500/90 text-white px-4 py-2 rounded-xl font-medium animate-in slide-in-from-bottom-4">
                            Warning: Verification check failed!
                        </div>
                    )}
                    {showTabSwitchWarning && (
                        <div className="bg-red-500/90 text-white px-4 py-2 rounded-xl font-medium animate-in slide-in-from-bottom-4">
                            Warning: Do not switch tabs! ({tabSwitchCount / 2} times detected)
                        </div>
                    )}
                    {showPasteWarning && (
                        <div className="bg-orange-500/90 text-white px-4 py-2 rounded-xl font-medium animate-in slide-in-from-bottom-4">
                            {pasteCount == 0
                                ? "Paste detected, Added warn!"
                                : `Paste detected! Warning ${pasteCount == 0 ? 1 : pasteCount}/3`
                            }
                        </div>
                    )}
                    {showBotWarning && (
                        <div className="bg-red-500/90 text-white px-4 py-2 rounded-xl font-medium animate-in slide-in-from-bottom-4">
                            Detected Unusual mouse movement!
                        </div>
                    )}
                    {submitted ? (<div className='flex flex-row items-center justify-center gap-4'>
                        <div className='flex flex-col items-center gap-2'>
                            <Link href={`/report?correct=${Object.values(results).filter(Boolean).length}&total=${randomizedQuestions.length}`} className='bg-blue-400/20 text-white rounded-full px-5 py-2 font-semibold text-lg'>View Report</Link>
                        </div>
                    </div>) : (
                        <div className='flex flex-row items-center justify-center gap-4'>
                            <div className='bg-red-700 rounded-full aspect-square text-white font-semibold h-12 flex items-center justify-center w-12 text-xl'>{tabSwitchCount}</div>
                            <button
                                onClick={handleSubmitAll}
                                className={`text-[#1D2735] font-bold py-3 px-7 rounded-full transform transition-all duration-200 border-2 ${isAllAnswered() ? 'bg-white/90 hover:scale-105 border-transparent' : 'bg-white/20 backdrop-blur-lg text-white border-white cursor-not-allowed'}`}
                            >
                                Submit All Answers
                            </button>
                        </div>
                    )}
                </div >
            </MouseMovementAnalyzer >
        </div >
    ) : (
        <div className='flex flex-col h-full max-w-screen-xl items-center justify-center w-full pl-[20vw] px-24 gap-4 py-16 overflow-auto'>
            <h1 className='text-2xl font-semibold text-white'>This quiz can only be attended in Full Screen mode.</h1>

            <button
                onClick={enterFullscreen}
                id="fffsss"
                className='bg-blue-400/20 text-white rounded-full px-5 py-2 font-medium'
            >
                Enter Fullscreen
            </button>
            <button
                onClick={() => router.back()}
                className='bg-white/10 text-white px-4 py-2 rounded-lg font-medium'
            >
                Go Back
            </button>

        </div>
    );
}
