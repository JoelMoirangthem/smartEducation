const path = require('path');
const fs = require('fs');

const __dirname_sim = "D:\\Attendance\\backend\\src\\controllers";
const fileUrl = "/uploads/notes/test.pdf";
const absolutePath = path.join(__dirname_sim, "..", "..", fileUrl);

console.log("Simulated Path:", absolutePath);
console.log("Normalized Path:", path.normalize(absolutePath));
