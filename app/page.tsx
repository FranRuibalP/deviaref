'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Type definition for our JSON data
interface PoseInfo {
  id: string;
  title: string;
  url: string;
  folder: string;
}

export default function Home() {
  const [gallery, setGallery] = useState<PoseInfo[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('All');

  // Timer and current pose states
  const [sessionActive, setSessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState<number>(60); // Seconds per pose
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [currentPose, setCurrentPose] = useState<PoseInfo | null>(null);
  const [queue, setQueue] = useState<PoseInfo[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load JSON on component mount
  useEffect(() => {
    fetch('/gallery.json')
      .then((res) => res.json())
      .then((data: PoseInfo[]) => {
        setGallery(data);
        const uniqueFolders = Array.from(new Set(data.map((item) => item.folder)));
        setFolders(['All', ...uniqueFolders]);
      });
  }, []);

  // Array shuffle function (Fisher-Yates)
  const shuffle = (array: PoseInfo[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const startSession = () => {
    const filteredGallery = selectedFolder === 'All'
      ? gallery
      : gallery.filter((img) => img.folder === selectedFolder);

    if (filteredGallery.length === 0) return alert('No images found in this folder.');

    const shuffled = shuffle(filteredGallery);
    setQueue(shuffled);
    setSessionActive(true);
    setIsPaused(false);

    const firstPose = shuffled.pop();
    if (firstPose) {
      setCurrentPose(firstPose);
      setTimeLeft(duration);
    }
  };

  // Wrapped in useCallback to safely use them inside the keyboard event listener
  const nextPose = useCallback(() => {
    if (queue.length === 0) {
      setSessionActive(false);
      // Use setTimeout so the alert doesn't block the UI update
      setTimeout(() => alert('Practice session finished!'), 10);
      return;
    }
    const nextList = [...queue];
    setCurrentPose(nextList.pop() || null);
    setQueue(nextList);
    setTimeLeft(duration);
    setIsPaused(false);
  }, [queue, duration]);

  const stopSession = useCallback(() => {
    setSessionActive(false);
    setCurrentPose(null);
    setIsPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  // Main timer logic
  useEffect(() => {
    if (sessionActive && !isPaused && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (sessionActive && !isPaused && timeLeft === 0) {
      nextPose();
    }
    return () => clearTimeout(timerRef.current as NodeJS.Timeout);
  }, [timeLeft, sessionActive, isPaused, nextPose]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sessionActive) return; // Shortcuts only work during an active session

      if (e.code === 'Space') {
        e.preventDefault(); // Prevents the browser from scrolling down
        togglePause();
      } else if (e.key === 'ArrowRight') {
        nextPose();
      } else if (e.key === 'Escape') {
        stopSession();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup listener on unmount or state change
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionActive, togglePause, nextPose, stopSession]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center p-4">

      {!sessionActive ? (
        <div className="max-w-md w-full bg-neutral-800 p-8 rounded-xl shadow-lg border border-neutral-700">
          <h1 className="text-2xl font-bold mb-6 text-center text-teal-400">Gesture Drawing Timer</h1>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-neutral-400">Folder / Category</label>
            <select
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 outline-none focus:border-teal-500 transition-colors"
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
            >
              {folders.map(folder => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
            </select>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium mb-2 text-neutral-400">Time per pose</label>
            <div className="grid grid-cols-3 gap-2">
              {[30, 60, 120, 300].map(time => (
                <button
                  key={time}
                  onClick={() => setDuration(time)}
                  className={`p-2 rounded-lg font-medium transition-all ${
                    duration === time
                      ? 'bg-teal-500 text-white'
                      : 'bg-neutral-900 border border-neutral-700 hover:bg-neutral-700'
                  }`}
                >
                  {time >= 60 ? `${time/60}m` : `${time}s`}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startSession}
            className="w-full bg-teal-500 hover:bg-teal-400 text-neutral-900 font-bold text-lg py-3 rounded-lg transition-colors"
          >
            Start Session
          </button>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-between">
          {/* Top Control Bar */}
          <div className="w-full flex justify-between items-center bg-neutral-800 p-4 rounded-xl mb-4 shadow-md max-w-6xl">
            <button
              onClick={stopSession}
              className="text-red-400 hover:text-red-300 font-medium px-4 py-2 bg-red-400/10 rounded-lg transition-colors flex flex-col items-center leading-tight"
            >
              <span>Stop</span>
              <span className="text-[10px] opacity-70">[Esc]</span>
            </button>

            {/* Center controls: Pause and Timer */}
            <div className="flex items-center gap-6">
              <button
                onClick={togglePause}
                className="text-yellow-400 hover:text-yellow-300 font-medium px-4 py-2 bg-yellow-400/10 rounded-lg transition-colors w-24 flex flex-col items-center leading-tight"
              >
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
                <span className="text-[10px] opacity-70">[Space]</span>
              </button>

              <div className={`text-4xl font-mono font-bold w-24 text-center ${
                isPaused ? 'text-neutral-500' : (timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-teal-400')
              }`}>
                {formatTime(timeLeft)}
              </div>
            </div>

            <button
              onClick={nextPose}
              className="text-neutral-300 hover:text-white font-medium px-4 py-2 bg-neutral-700 rounded-lg transition-colors flex flex-col items-center leading-tight"
            >
              <span>Skip Pose</span>
              <span className="text-[10px] opacity-70">[ → ]</span>
            </button>
          </div>

          {/* Image Viewer */}
          <div className="flex-1 w-full max-w-6xl rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center border border-neutral-800">
            {currentPose && (
              <img
                src={currentPose.url}
                alt={currentPose.title}
                className={`max-w-full max-h-[80vh] object-contain transition-opacity duration-300 ${isPaused ? 'opacity-20' : 'opacity-100'}`}
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}
