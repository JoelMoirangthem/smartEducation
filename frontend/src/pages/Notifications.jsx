import React, { useState, useEffect } from "react";
import axios from "axios";
import { Check, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import io from "socket.io-client";
import { jwtDecode } from "jwt-decode";

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();

        const token = localStorage.getItem("token");
        if (token) {
            const socket = io("http://localhost:5000");
            const decoded = jwtDecode(token);
            socket.emit("join_room", `user:${decoded.id}`);

            socket.on("new_notification", (newNotif) => {
                setNotifications(prev => [newNotif, ...prev]);
            });

            return () => socket.close();
        }
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://localhost:5000/api/v1/notifications", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching notifications:", error);
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem("token");
            await axios.put(
                `http://localhost:5000/api/v1/notifications/${id}/read`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Update local state
            setNotifications(notifications.map(n =>
                n._id === id ? { ...n, isRead: true } : n
            ));
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const markAllRead = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.put(
                "http://localhost:5000/api/v1/notifications/read-all",
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Update local state
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error("Error marking all read:", error);
        }
    };

    // Helper to get icon based on type
    const getIcon = (type) => {
        switch (type) {
            case "success": return <CheckCircle className="h-6 w-6 text-green-500" />;
            case "warning": return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
            case "error": return <XCircle className="h-6 w-6 text-red-500" />;
            default: return <Info className="h-6 w-6 text-blue-500" />;
        }
    };

    if (loading) return <div className="text-center mt-10">Loading notifications...</div>;

    return (
        <div className="max-w-4xl mx-auto mt-10 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Notifications</h2>
                {notifications.length > 0 && notifications.some(n => !n.isRead) && (
                    <button
                        onClick={markAllRead}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg shadow text-gray-500">
                    No new notifications.
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map((notification) => (
                        <div
                            key={notification._id}
                            className={`flex items-start p-4 rounded-lg shadow-sm border transition-all ${notification.isRead ? "bg-gray-50 border-gray-100" : "bg-white border-indigo-100 shadow-md"
                                }`}
                        >
                            <div className="flex-shrink-0 mr-4">
                                {getIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                                <p className={`text-gray-800 ${!notification.isRead && "font-semibold"}`}>
                                    {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {new Date(notification.createdAt).toLocaleString()}
                                </p>
                            </div>
                            {!notification.isRead && (
                                <button
                                    onClick={() => markAsRead(notification._id)}
                                    className="ml-4 text-gray-400 hover:text-indigo-600"
                                    title="Mark as read"
                                >
                                    <Check className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Notifications;
