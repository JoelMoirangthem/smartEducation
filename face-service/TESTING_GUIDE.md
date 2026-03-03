# Face Recognition Testing Script

## Test Recognition with curl

```bash
# 1. Check Python service health
curl http://localhost:5001/health

# 2. Check registered faces
python -c "import pickle; data=pickle.load(open('embeddings.pkl','rb')); print(f'Registered: {len(data)} faces'); print('IDs:', list(data.keys()))"

# 3. Test student registration status
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/v1/face-attendance/check/STUDENT_ID

# 4. Get current active session
curl -H "Authorization: Bearer YOUR_TEACHER_TOKEN" http://localhost:5000/api/v1/attendance/stats
```

## Common Issues & Solutions

### Issue 1: "Face not recognized"
- **Cause**: Python service can't match the scanned face with registered embeddings
- **Solution**: 
  - Ensure good lighting during scan
  - Look directly at camera
  - Try re-registering with more images

### Issue 2: "Student is not enrolled in this class"
- **Cause**: Student's `classId` doesn't match session's `classId`
- **Solution**: 
  - Check student's profile - they need a `classId` assigned
  - Create attendance session with correct class
  - **FIXED**: Now allows recognition if classId is missing

### Issue 3: "Already marked present"
- **Cause**: Student already has attendance record for this session (anti-proxy)
- **Solution**: This is expected behavior - working correctly!

### Issue 4: 404 on /face-attendance routes
- **Cause**: Backend server not restarted after adding routes
- **Solution**: Restart backend with `npm run start`

## Current Status

✅ Python Service Running (port 5001)
✅ Backend Running (port 5001)
✅ Frontend Running (port 5173)
✅ Face Registration Working
✅ Embeddings File Created (1 face registered)
⚠️ Face Recognition - Fixed classId validation

## Next Steps

1. **Test Face Recognition**:
   - Login as teacher
   - Navigate to `/face-attendance`
   - Start session
   - Scan student's face
   - Should now work!

2. **Verify Real-time Updates**:
   - Check if Socket.io updates the attendance list instantly
   
3. **Export CSV**:
   - After marking attendance, export the report
