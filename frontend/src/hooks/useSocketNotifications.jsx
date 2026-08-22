import React, { useEffect, useState, useCallback, useRef } from 'react';
import { initializeSocket, disconnectSocket } from '../services/socket.service';
import { toast } from 'react-toastify';
import { jwtDecode } from "jwt-decode";
import './useSocketNotifications.css';

const useSocketNotifications = () => {
    const [isConnected, setIsConnected] = useState(false);

    const soundAvailable = useRef(null);

    const playNotificationSound = useCallback(() => {
        try {
            if (soundAvailable.current === false) return;
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.3;
            audio.play()
                .then(() => { soundAvailable.current = true; })
                .catch((err) => {
                    // 404 or blocked autoplay: disable sound silently, keep notifications working
                    if (soundAvailable.current === null) soundAvailable.current = false;
                    console.log('Audio play failed:', err);
                });
        } catch {
            soundAvailable.current = false;
        }
    }, []);

    useEffect(() => {
        let user = JSON.parse(localStorage.getItem('user'));
        const token = localStorage.getItem('token');

        if (!user && token) {
            try {
                const decoded = jwtDecode(token);
                user = {
                    id: decoded.id,
                    role: decoded.role,
                    classId: decoded.classId,
                    name: decoded.name
                };
            } catch (err) {
                console.error("Token decoding failed in socket hook:", err);
            }
        }

        if (!user) {
            console.warn('No user found, skipping socket initialization');
            return;
        }

        const { id: userId, classId, role } = user;

        // Initialize socket connection
        const socket = initializeSocket(userId, classId, role);

        // Connection status handlers
        socket.on('connect', () => {
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        // MARKS UPLOADED event
        socket.on('marks_uploaded', (data) => {
            console.log('📊 Marks uploaded event received:', data);

            const percentage = data.percentage || ((data.marksObtained / data.maxMarks) * 100).toFixed(1);
            const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F';

            toast.success(
                <div className="custom-toast marks-toast-inner">
                    <div className="toast-title">🎯 Result Synchronized!</div>
                    <div className="toast-content">
                        <div style={{ fontWeight: 800, color: 'white', fontSize: '1rem', marginBottom: '4px' }}>{data.subjectName}</div>
                        <div style={{ opacity: 0.9 }}>
                            Score: <span style={{ fontWeight: 700 }}>{data.marksObtained}/{data.maxMarks}</span>
                            <span style={{ marginLeft: '8px', padding: '2px 6px', background: 'rgba(255,255,255,0.2)', borderRadius: '6px', fontSize: '0.7rem' }}>{percentage}%</span>
                        </div>
                        <div className="toast-meta" style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', opacity: 0.7 }}>
                            <span>{data.examType.toUpperCase()}</span>
                            <span style={{ width: '4px', height: '4px', background: 'white', borderRadius: '50%' }}></span>
                            <span style={{ fontWeight: 800 }}>GRADE {grade}</span>
                        </div>
                    </div>
                </div>,
                {
                    autoClose: 6000,
                    position: 'top-right',
                    className: 'marks-toast-premium'
                }
            );

            playNotificationSound();
        });

        // NOTICE CREATED event
        socket.on('notice_created', (notice) => {
            console.log('📢 Real-time notice received:', notice);

            // 1. FILTER: Don't notify the producer (the user who created it)
            // Backend sends 'createdBy' as an object with '_id'
            const creatorId = notice.createdBy?._id || notice.createdBy;
            if (creatorId && creatorId.toString() === userId?.toString()) {
                console.log('⏭️ Skipping notification for self (producer)');
                return;
            }

            const priorityEmoji = {
                low: 'ℹ️',
                medium: '📌',
                high: '⚠️',
                urgent: '🚨'
            };

            const contentSnippet = notice.content
                ? (notice.content.substring(0, 120) + (notice.content.length > 120 ? '...' : ''))
                : (notice.description ? notice.description.substring(0, 120) : 'No content');

            toast.info(
                <div className="custom-toast notice-toast-wrapper">
                    <div className="toast-title">
                        {priorityEmoji[notice.priority] || '📢'} {notice.title}
                    </div>
                    <div className="toast-content" style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                        {contentSnippet}
                    </div>
                    <div className="toast-footer" style={{ fontSize: '0.7rem', marginTop: 8, opacity: 0.6 }}>
                        Posted by {notice.createdBy?.name || 'Academic Office'}
                    </div>
                </div>,
                {
                    autoClose: 7000,
                    position: 'top-right',
                    className: `notice-toast priority-${notice.priority}`,
                    toastId: `notice-${notice._id}` // Use toastId to prevent duplicates in case of double emission
                }
            );

            playNotificationSound();
        });

        // Cleanup on unmount
        return () => {
            disconnectSocket();
        };
    }, [playNotificationSound]);

    return { isConnected };
};

export default useSocketNotifications;
