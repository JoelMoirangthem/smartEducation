import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './NoticeCreate.css';

const NoticeCreate = () => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState(''); // Changed from description
    const [targetType, setTargetType] = useState('CLASS'); // Default to CLASS
    const [targetRole, setTargetRole] = useState('all');
    const [classId, setClassId] = useState('');
    const [subjectId, setSubjectId] = useState(''); // Added subjectId
    const [priority, setPriority] = useState('medium');

    const [subjects, setSubjects] = useState([]); // Use subjects instead of classes
    const [classes, setClasses] = useState([]); // All classes for admin
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState('');

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = JSON.parse(atob(token.split('.')[1]));
                setUserRole(decoded.role);
            } catch (e) {
                console.error("Token error", e);
            }
        }
        fetchAcademicData();
    }, []);

    const fetchAcademicData = async () => {
        try {
            const token = localStorage.getItem('token');
            // If admin, fetch all data. If teacher, fetch their subjects.
            const decoded = JSON.parse(atob(token.split('.')[1]));

            if (decoded.role === 'admin') {
                const [clsRes, subRes] = await Promise.all([
                    axios.get(`${API_URL}/v1/admin/classes`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_URL}/v1/admin/subjects`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setClasses(clsRes.data.classes || []);
                setSubjects(subRes.data.subjects || []);
            } else {
                const [clsRes, subRes] = await Promise.all([
                    axios.get(`${API_URL}/v1/user/classes`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_URL}/v1/user/subjects`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setClasses(clsRes.data || []);
                setSubjects(subRes.data || []);
            }
        } catch (error) {
            console.error('Error fetching academic data:', error);
            toast.error('Failed to load classes/subjects');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title || !content) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (targetType === 'CLASS' && !classId) {
            toast.error('Please select a class');
            return;
        }

        if (targetType === 'SUBJECT' && !subjectId) {
            toast.error('Please select a subject');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const payload = {
                title,
                content,
                targetType,
                targetRole,
                classId: (targetType === 'CLASS' || targetType === 'SUBJECT') ? classId : null,
                subjectId: targetType === 'SUBJECT' ? subjectId : null,
                priority
            };

            await axios.post(
                `${API_URL}/v1/notices/add`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('Notice broadcasted successfully!');

            // Reset form
            setTitle('');
            setContent('');
            setTargetType('CLASS');
            setTargetRole('all');
            setClassId('');
            setSubjectId('');
            setPriority('medium');

        } catch (error) {
            console.error('Error creating notice:', error);
            toast.error(error.response?.data?.error || 'Failed to create notice');
        } finally {
            setLoading(false);
        }
    };

    const availableClasses = classes;

    return (
        <div className="notice-create-container">
            <div className="notice-create-card">
                <h1 className="page-title">Broadcast Announcement</h1>

                <form onSubmit={handleSubmit} className="notice-form">
                    <div className="form-group">
                        <label>Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter notice title"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Content *</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Enter announcement details..."
                            rows="6"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Target Scope *</label>
                            <select
                                value={targetType === 'ROLE' ? (targetRole === 'teacher' ? 'TEACHERS' : 'STUDENTS') : targetType}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setTargetRole('all');
                                    if (val === 'TEACHERS') {
                                        setTargetType('ROLE');
                                        setTargetRole('teacher');
                                    } else if (val === 'STUDENTS') {
                                        setTargetType('ROLE');
                                        setTargetRole('student');
                                    } else {
                                        setTargetType(val);
                                    }
                                    setClassId('');
                                    setSubjectId('');
                                }}
                                required
                            >
                                {userRole === 'admin' && (
                                    <>
                                        <option value="ALL">Everyone (Global)</option>
                                        <option value="TEACHERS">All Teachers</option>
                                        <option value="STUDENTS">All Students</option>
                                    </>
                                )}
                                <option value="CLASS">Specific Class</option>
                                <option value="SUBJECT">Specific Subject</option>
                            </select>
                        </div>

                        {(targetType === 'CLASS' || targetType === 'SUBJECT') && (
                            <div className="form-group">
                                <label>Select Class *</label>
                                <select
                                    value={classId}
                                    onChange={(e) => setClassId(e.target.value)}
                                    required
                                >
                                    <option value="">-- Choose Class --</option>
                                    {availableClasses.map(cls => (
                                        <option key={cls._id} value={cls._id}>
                                            {cls.name} {cls.section ? `- ${cls.section}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {targetType === 'SUBJECT' && (
                            <div className="form-group">
                                <label>Select Subject *</label>
                                <select
                                    value={subjectId}
                                    onChange={(e) => {
                                        setSubjectId(e.target.value);
                                    }}
                                    required
                                >
                                    <option value="">-- Choose Subject --</option>
                                    {subjects
                                        .filter(s => !classId || (s.classId?._id === classId))
                                        .map(sub => (
                                            <option key={sub._id} value={sub._id}>
                                                {sub.name} {userRole === 'admin' ? `(${sub.classId?.name})` : ''}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Broadcasting...' : 'Send Announcement'}
                        </button>
                    </div>
                </form>

                <div className="notice-preview">
                    <h3>Preview</h3>
                    <div className="preview-card">
                        <div className={`priority-badge priority-${priority}`}>
                            {priority.toUpperCase()}
                        </div>
                        <h4>{title || 'Notice Title'}</h4>
                        <p>{content || 'Announcement details will appear here...'}</p>
                        <div className="preview-meta">
                            <span>Target: {
                                targetType === 'ALL' ? 'All Members' :
                                    targetType === 'ROLE' ? (targetRole === 'teacher' ? 'All Teachers' : 'All Students') :
                                        targetType === 'CLASS' ? 'Full Class' :
                                            'Subject Group'
                            }</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoticeCreate;
