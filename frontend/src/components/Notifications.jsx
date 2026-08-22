import React, { useState, useEffect, useRef, useMemo } from "react";
import api from "../services/api";
import {
    Bell,
    Check,
    CheckCheck,
    Trash2,
    AlertCircle,
    Trophy,
    MessageSquare,
    Calendar,
    Sparkles,
    Clock,
    User
} from "lucide-react";
import { initializeSocket } from "../services/socket.service";
import { jwtDecode } from "jwt-decode";

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    const token = localStorage.getItem("token");
    let userId = null;
    let userRole = null;
    let classId = null;

    if (token) {
        try {
            const decoded = jwtDecode(token);
            userId = decoded.id;
            userRole = decoded.role;
            classId = decoded.classId;
        } catch {
            console.error("Invalid token");
        }
    }

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (token && userId) {
            api.get('/notifications').then(res => {
                if (Array.isArray(res.data)) {
                    setNotifications(res.data);
                    setUnreadCount(res.data.filter(n => !n.isRead).length);
                }
            }).catch(error => console.error("Error fetching notifications", error));

            const socket = initializeSocket(userId, classId, userRole);
            if (socket) {
                const handleNewNotification = (data) => {
                    // Filter out notifications produced by the current user
                    // Checking both metadata.creatorId and data.metadata.createdBy?._id
                    const creatorId = data.metadata?.creatorId || data.metadata?.createdBy?._id;

                    if (creatorId && creatorId.toString() === userId?.toString()) {
                        console.log('⏭️ Drop self-notif on client:', data.message);
                        return;
                    }

                    setNotifications(prev => [data, ...prev]);
                    setUnreadCount(prev => prev + 1);
                };
                socket.on("new_notification", handleNewNotification);
                return () => socket.off("new_notification", handleNewNotification);
            }
        }
    }, [classId, token, userId, userRole]);

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {
            console.error("Error marking read");
        }
    };

    const markAllAsRead = async () => {
        if (unreadCount === 0) return;
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch {
            console.error("Error marking all as read");
        }
    };

    const clearRead = async () => {
        try {
            await api.delete('/notifications/read-cleared');
            setNotifications(prev => prev.filter(n => !n.isRead));
        } catch {
            console.error("Error clearing read");
        }
    };

    // --- ALGORITHM LAYOUT: Grouping Logic ---
    const groupedNotifications = useMemo(() => {
        const groups = {
            today: [],
            yesterday: [],
            earlier: []
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        notifications.forEach(notif => {
            const date = new Date(notif.createdAt);
            date.setHours(0, 0, 0, 0);

            if (date.getTime() === today.getTime()) {
                groups.today.push(notif);
            } else if (date.getTime() === yesterday.getTime()) {
                groups.yesterday.push(notif);
            } else {
                groups.earlier.push(notif);
            }
        });

        return groups;
    }, [notifications]);

    const getIcon = (type) => {
        const iconProps = { size: 18 };
        switch (type) {
            case 'marks_uploaded': return <Trophy {...iconProps} className="text-amber-400" />;
            case 'notice': return <AlertCircle {...iconProps} className="text-indigo-400" />;
            case 'attendance': return <Calendar {...iconProps} className="text-emerald-400" />;
            case 'info': return <Sparkles {...iconProps} className="text-sky-400" />;
            default: return <Bell {...iconProps} className="text-indigo-400" />;
        }
    };

    const formatRelativeTime = (date) => {
        const d = new Date(date);
        const now = new Date();
        const diffInSeconds = Math.floor((now - d) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const renderGroup = (title, items) => {
        if (items.length === 0) return null;
        return (
            <div key={title} className="notif-group mb-2">
                <div className="px-5 py-2 text-[0.62rem] font-bold text-indigo-400/50 uppercase tracking-[0.12em] flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-indigo-400/30"></span>
                    {title}
                </div>
                {items.map(notif => {
                    const contentSnippet = notif.metadata?.content
                        ? (notif.metadata.content.length > 60 ? notif.metadata.content.substring(0, 60) + '...' : notif.metadata.content)
                        : null;
                    const posterName = notif.metadata?.createdBy || 'System';

                    return (
                        <div
                            key={notif._id}
                            onClick={() => !notif.isRead && markAsRead(notif._id)}
                            className={`notif-item ${!notif.isRead ? 'unread' : ''}`}
                        >
                            <div className="notif-icon-circle">
                                {getIcon(notif.type)}
                            </div>
                            <div className="notif-content">
                                <div className="notif-message">
                                    {notif.message}
                                </div>
                                {contentSnippet && (
                                    <div style={{ fontSize: '0.74rem', color: 'var(--c-muted)', opacity: 0.8, marginBottom: 4 }}>
                                        {contentSnippet}
                                    </div>
                                )}
                                <div className="notif-footer-row">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span className="notif-time">
                                            <Clock size={10} />
                                            {formatRelativeTime(notif.createdAt)}
                                        </span>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--c-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <User size={10} />
                                            {posterName}
                                        </span>
                                    </div>
                                    {!notif.isRead && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="notif-bell-btn"
                aria-haspopup="true"
                aria-expanded={showDropdown}
            >
                <Bell size={21} strokeWidth={2.2} />
                {unreadCount > 0 && (
                    <span className={`notif-badge pulse`}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div className="notif-dropdown">
                    <div className="notif-header">
                        <div className="flex items-center gap-3">
                            <h3>Activity</h3>
                            {unreadCount > 0 && (
                                <span className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-400 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider border border-indigo-500/10">
                                    {unreadCount} New
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={markAllAsRead}
                                className="notif-action-btn flex items-center gap-1.5"
                                title="Mark all as read"
                                disabled={unreadCount === 0}
                            >
                                <CheckCheck size={14} className={unreadCount === 0 ? 'opacity-30' : ''} />
                            </button>
                            <button onClick={clearRead} className="notif-action-btn flex items-center gap-1.5 text-red-400/70 hover:text-red-400" title="Clear read">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="notif-scroll-area custom-scrollbar py-2">
                        {notifications.length === 0 ? (
                            <div className="notif-empty">
                                <div className="p-5 bg-indigo-500/5 rounded-2xl mb-2">
                                    <Bell size={32} className="opacity-10" />
                                </div>
                                <p>No New Notifications</p>
                                <span style={{ fontSize: '0.7rem', color: 'var(--c-muted)', padding: '0 40px', lineHeight: '1.4', display: 'block' }}>System updates and announcements will appear here</span>
                            </div>
                        ) : (
                            <>
                                {renderGroup("Today", groupedNotifications.today)}
                                {renderGroup("Yesterday", groupedNotifications.yesterday)}
                                {renderGroup("Earlier", groupedNotifications.earlier)}
                            </>
                        )}
                    </div>

                    {notifications.length > 5 && (
                        <div className="p-3 border-t border-white/5 text-center bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors">
                            <button className="text-[0.7rem] font-bold text-indigo-400 uppercase tracking-widest">
                                View History
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Notifications;
