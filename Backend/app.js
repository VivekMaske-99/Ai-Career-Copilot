const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mongoose = require("mongoose");
require("dotenv").config();

const Groq = require("groq-sdk"); // ✅ NEW
const fetch = globalThis.fetch || require('node-fetch');

const AIResult = require("./models/AIResult");

const app = express();

// 🔥 Groq setup
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ✅ MongoDB connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("Mongo Error ❌", err));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

// test route
app.get('/', (req, res) => {
  res.send("Server running 🚀");
});


// 🔥 MAIN ROUTE
app.post('/api/analyze', upload.single('resume'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { filename } = req.file;
  const filePath = req.file.path;

  console.log(`Uploading ${filename}`);

  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    if (!data.text || data.text.trim().length === 0) {
      return res.status(400).json({ error: 'No readable text found in PDF' });
    }

    const rawText = data.text;
    const text = rawText.toLowerCase();

    // ATS Score
    let atsScore = 0;
    if (text.includes('javascript')) atsScore += 20;
    if (text.includes('react')) atsScore += 20;
    if (text.includes('node')) atsScore += 20;
    if (text.includes('sql')) atsScore += 20;
    if (text.includes('python')) atsScore += 20;

    // Skills
    const skillKeywords = ["JavaScript", "React", "Node.js", "SQL", "Python", "MongoDB", "HTML", "CSS"];
    const skills = skillKeywords.filter(skill => text.includes(skill.toLowerCase()));

    // Feedback
    let feedback = [];

    if (atsScore < 60) {
      feedback.push("Your resume is missing important technical keywords.");
    } else if (atsScore < 100) {
      feedback.push("Good resume but can be improved with more relevant skills.");
    } else {
      feedback.push("Excellent resume with strong technical skills.");
    }

    feedback.push("Add measurable achievements (numbers, impact) in your experience.");

    // 🔥 SAVE INITIAL RECORD
    await AIResult.create({
      filename,
      status: "processing"
    });

    const encodedFilename = encodeURIComponent(filename);

    // 🔥 SEND FAST RESPONSE
    res.json({
      success: true,
      filename: encodedFilename,
      atsScore,
      skills,
      feedback,
      aiFeedback: "Processing...",
      summaryText: rawText.slice(0, 300)
    });

    // 🔥 BACKGROUND AI
    setTimeout(async () => {
      try {
        console.log("🚀 AI STARTED:", filename);

        const limitedText = rawText.slice(0, 1000);
        let aiFeedback = "";

        // 🔥 SWITCH BASED ON ENV
        if (process.env.AI_PROVIDER === "groq") {
          // ✅ GROQ (PRODUCTION)
          const completion = await groq.chat.completions.create({
  model: "llama-3.1-8b-instant", // ✅ UPDATED
  messages: [
    {
      role: "user",
      content: `Give 3 short resume improvement tips:\n\n${limitedText}`
    }
  ]
});

          aiFeedback = completion.choices[0].message.content;
        } else {
          // 🧪 OLLAMA (LOCAL DEV)
          const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "phi3:mini",
              prompt: `Give 3 short resume improvement tips:\n\n${limitedText}`,
              stream: false
            })
          });

          const data = await response.json();
          aiFeedback = data.response || "AI failed";
        }

        // 🔥 UPDATE DB
        await AIResult.findOneAndUpdate(
          { filename },
          {
            status: "done",
            aiFeedback
          }
        );

        console.log("🔥 AI STORED:", filename);

      } catch (err) {
        console.error("AI ERROR:", err.message);

        await AIResult.findOneAndUpdate(
          { filename },
          {
            status: "done",
            aiFeedback: "AI failed to generate response"
          }
        );
      }
    }, 0);

  } catch (err) {
    console.error("PDF ERROR:", err);

    res.status(500).json({
      error: 'Failed to extract text from PDF'
    });
  }
});


// 🔥 GET RESULT
app.get('/api/ai-result/:filename', async (req, res) => {
  const decodedFilename = decodeURIComponent(req.params.filename);

  const result = await AIResult.findOne({ filename: decodedFilename });

  if (!result) {
    return res.json({ status: "processing" });
  }

  res.json({
    status: result.status,
    aiFeedback: result.aiFeedback
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
console.log("GROQ:", process.env.GROQ_API_KEY ? "FOUND" : "MISSING");
console.log("MONGO:", process.env.MONGO_URI ? "FOUND" : "MISSING");