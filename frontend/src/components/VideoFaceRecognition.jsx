import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1';

const VideoFaceRecognition = ({ sessionId, onAttendanceMarked }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [stream, setStream] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [recognizedStudent, setRecognizedStudent] = useState(null);
    const [error, setError] = useState('');
    const [processingCount, setProcessingCount] = useState(0);

    // Start webcam
    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStream(mediaStream);
            setError('');
        } catch (err) {
            setError('Failed to access camera. Please allow camera permissions.');
            console.error('Camera error:', err);
        }
    };

    // Stop webcam
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsScanning(false);
    };

    // Capture frame from video
    const captureFrame = () => {
        if (!videoRef.current || !canvasRef.current) return null;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        return canvas.toDataURL('image/jpeg', 0.8);
    };

    // Recognize face in frame
    const recognizeFace = async (imageData) => {
        try {
            const token = localStorage.getItem('token');

            const response = await axios.post(
                `${API_URL}/face-attendance/mark`,
                {
                    sessionId,
                    image: imageData
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            return response.data;
        } catch (err) {
            console.error('Recognition error:', err);
            return { recognized: false };
        }
    };

    // Auto-scan loop
    useEffect(() => {
        if (!isScanning || !stream) return;

        const interval = setInterval(async () => {
            const frame = captureFrame();
            if (!frame) return;

            setProcessingCount(prev => prev + 1);

            const result = await recognizeFace(frame);

            if (result.recognized && !result.alreadyMarked) {
                setRecognizedStudent({
                    name: result.student?.name || 'Student',
                    confidence: result.confidence,
                    markedAt: new Date()
                });

                // Notify parent component
                if (onAttendanceMarked) {
                    onAttendanceMarked(result);
                }

                // Show success for 3 seconds
                setTimeout(() => {
                    setRecognizedStudent(null);
                }, 3000);
            }
        }, 500); // Process 2 frames per second

        return () => clearInterval(interval);
    }, [isScanning, stream, sessionId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-white">
                    📹 Live Face Recognition
                </h2>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg">
                        <p className="text-red-300">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {recognizedStudent && (
                    <div className="mb-4 p-4 bg-green-500/20 border border-green-500 rounded-lg animate-pulse">
                        <p className="text-green-300 text-lg font-bold">
                            ✅ {recognizedStudent.name} - Attendance Marked!
                        </p>
                        <p className="text-green-200 text-sm">
                            Confidence: {recognizedStudent.confidence}%
                        </p>
                    </div>
                )}

                {/* Video Feed */}
                <div className="relative mb-6 bg-black rounded-lg overflow-hidden aspect-video">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {!stream && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                            <p className="text-gray-500">Camera not started</p>
                        </div>
                    )}

                    {/* Scanning Indicator */}
                    {isScanning && (
                        <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            Scanning... ({processingCount} frames)
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex gap-3">
                    {!stream ? (
                        <button
                            onClick={startCamera}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition text-white"
                        >
                            📹 Start Camera
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsScanning(!isScanning)}
                                className={`flex-1 py-3 rounded-lg font-semibold transition text-white ${isScanning
                                    ? 'bg-yellow-600 hover:bg-yellow-700'
                                    : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                {isScanning ? '⏸️ Pause Scanning' : '▶️ Start Scanning'}
                            </button>
                            <button
                                onClick={stopCamera}
                                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition text-white"
                            >
                                Stop Camera
                            </button>
                        </>
                    )}
                </div>

                {/* Instructions */}
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <h3 className="font-semibold mb-2 text-white">📋 Instructions:</h3>
                    <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                        <li>Click "Start Camera" to begin</li>
                        <li>Click "Start Scanning" to begin recognition</li>
                        <li>Students should stand in front of camera one at a time</li>
                        <li>System will automatically recognize and mark attendance</li>
                        <li>Green notification shows when attendance is marked</li>
                        <li>Each student's face is scanned every 500ms until recognized</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default VideoFaceRecognition;
