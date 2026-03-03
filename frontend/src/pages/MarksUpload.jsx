import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './MarksUpload.css';

const MarksUpload = () => {
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);

    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [examType, setExamType] = useState('quiz');

    const [marksData, setMarksData] = useState([]);
    const [loading, setLoading] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Derive unique classes from subjects
    const uniqueClasses = Array.from(new Map(
        subjects
            .filter(s => s.classId)
            .map(s => [s.classId._id, s.classId])
    ).values());

    // Fetch classes/subjects on mount
    useEffect(() => {
        fetchAcademicData();
    }, []);

    // Filter subjects based on selected class
    const filteredSubjects = subjects.filter(s => s.classId?._id === selectedClassId);

    // Fetch students when class/subject is selected
    useEffect(() => {
        if (selectedClassId && selectedSubjectId) {
            fetchStudents(selectedClassId);
        } else {
            setStudents([]);
            setMarksData([]);
        }
    }, [selectedClassId, selectedSubjectId]);

    const fetchAcademicData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/v1/user/subjects`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubjects(response.data || []);
        } catch (error) {
            console.error('Error fetching academic data:', error);
            toast.error('Failed to load academic data');
        }
    };

    const fetchStudents = async (classId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/v1/admin/students`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { classId }
            });

            const studentList = response.data.students || [];
            setStudents(studentList);

            // Initialize marks data for all students
            setMarksData(studentList.map(student => ({
                studentId: student._id,
                studentName: student.name,
                marksObtained: '',
                maxMarks: 100,
                feedback: ''
            })));
        } catch (error) {
            console.error('Error fetching students:', error);
            toast.error('Failed to fetch students');
        }
    };

    const handleMarksChange = (studentId, field, value) => {
        setMarksData(prev => prev.map(mark =>
            mark.studentId === studentId
                ? { ...mark, [field]: value }
                : mark
        ));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedClassId || !selectedSubjectId || !examType) {
            toast.error('Please select class, subject, and exam type');
            return;
        }

        // Filter out students with empty marks
        const validMarks = marksData.filter(mark => mark.marksObtained !== '');

        if (validMarks.length === 0) {
            toast.error('Please enter marks for at least one student');
            return;
        }

        // Validate marks
        const invalidMarks = validMarks.filter(mark =>
            parseFloat(mark.marksObtained) > parseFloat(mark.maxMarks)
        );

        if (invalidMarks.length > 0) {
            toast.error('Marks obtained cannot exceed max marks');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const payload = {
                classId: selectedClassId,
                subjectId: selectedSubjectId,
                examType,
                marks: validMarks.map(mark => ({
                    studentId: mark.studentId,
                    marksObtained: parseFloat(mark.marksObtained),
                    maxMarks: parseFloat(mark.maxMarks),
                    feedback: mark.feedback
                }))
            };

            const response = await axios.post(
                `${API_URL}/v1/marks/upload`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(`Marks uploaded successfully! ${response.data.success} students`);

            // Reset form
            setMarksData(marksData.map(mark => ({
                ...mark,
                marksObtained: '',
                feedback: ''
            })));

        } catch (error) {
            console.error('Error uploading marks:', error);
            toast.error(error.response?.data?.error || 'Failed to upload marks');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="marks-upload-container">
            <div className="marks-upload-card">
                <h1 className="page-title">Gradebook Upload</h1>

                <form onSubmit={handleSubmit} className="marks-form">
                    <div className="form-section">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Target Class *</label>
                                <select
                                    value={selectedClassId}
                                    onChange={(e) => {
                                        setSelectedClassId(e.target.value);
                                        setSelectedSubjectId('');
                                    }}
                                    required
                                >
                                    <option value="">-- Choose Class --</option>
                                    {uniqueClasses.map(cls => (
                                        <option key={cls._id} value={cls._id}>
                                            {cls.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Subject *</label>
                                <select
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    disabled={!selectedClassId}
                                    required
                                >
                                    <option value="">-- Choose Subject --</option>
                                    {filteredSubjects.map(subject => (
                                        <option key={subject._id} value={subject._id}>
                                            {subject.name} ({subject.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Assessment Category *</label>
                                <select
                                    value={examType}
                                    onChange={(e) => setExamType(e.target.value)}
                                    required
                                >
                                    <option value="quiz">Quiz</option>
                                    <option value="assignment">Assignment</option>
                                    <option value="unit1">Unit Test 1</option>
                                    <option value="unit2">Unit Test 2</option>
                                    <option value="midterm">Midterm</option>
                                    <option value="final">Final Exam</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {students.length > 0 && (
                        <div className="students-section">
                            <div className="section-header">
                                <h2>Candidate List ({students.length})</h2>
                                <p className="text-muted">Enter marks obtained by each student.</p>
                            </div>
                            <div className="students-table-container shadow-sm rounded-xl overflow-hidden">
                                <table className="students-table">
                                    <thead>
                                        <tr>
                                            <th>Student Identity</th>
                                            <th>Marks *</th>
                                            <th>Total</th>
                                            <th>Result</th>
                                            <th>Commentary</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {marksData.map((mark) => {
                                            const percentage = mark.marksObtained && mark.maxMarks
                                                ? ((parseFloat(mark.marksObtained) / parseFloat(mark.maxMarks)) * 100).toFixed(2)
                                                : '-';

                                            return (
                                                <tr key={mark.studentId}>
                                                    <td className="student-name font-semibold">{mark.studentName}</td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={mark.marksObtained}
                                                            onChange={(e) => handleMarksChange(mark.studentId, 'marksObtained', e.target.value)}
                                                            placeholder="Score"
                                                            className="table-input"
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={mark.maxMarks}
                                                            onChange={(e) => handleMarksChange(mark.studentId, 'maxMarks', e.target.value)}
                                                            className="table-input w-20"
                                                        />
                                                    </td>
                                                    <td className="percentage">
                                                        {percentage !== '-' && (
                                                            <span className={`badge ${parseFloat(percentage) >= 40 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-2 py-1 rounded-lg font-bold`}>
                                                                {percentage}%
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={mark.feedback}
                                                            onChange={(e) => handleMarksChange(mark.studentId, 'feedback', e.target.value)}
                                                            placeholder="Feedback"
                                                            className="table-input"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="form-actions mt-8">
                                <button type="submit" className="btn-submit w-full py-4 text-white font-bold rounded-xl transition-all" disabled={loading}>
                                    {loading ? 'Processing...' : 'Commit Marks to Ledger'}
                                </button>
                            </div>
                        </div>
                    )}

                    {!selectedClassId && (
                        <div className="info-message py-20 text-center text-indigo-300 italic opacity-60">
                            Awaiting class selection to load students...
                        </div>
                    )}

                    {selectedClassId && !selectedSubjectId && (
                        <div className="info-message py-20 text-center text-indigo-300 italic opacity-60">
                            Please select a subject to activate the gradebook
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default MarksUpload;
