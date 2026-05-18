const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mongoose = require("mongoose");
const cors = require("cors");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const Groq = require("groq-sdk");
const fetch = globalThis.fetch || require('node-fetch');
const AIResult = require("./models/AIResult");

const app = express();


// ✅ 🔥 CORS FIX
app.use(cors({
  origin: "*", // allow all (for now)
  methods: ["GET", "POST"],
  credentials: true
}));


// 🔥 Create uploads folder FIRST
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


// ✅ Middlewares
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// New auth and dashboard routes (non-destructive additions)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
// Analysis route (will include recruiter simulation retrieval)
app.use('/api/analysis', require('./routes/analysisRoutes'));

// Fallback direct analysis GET (in case route file fails to register)
const authMiddleware = require('./middleware/auth');
app.get('/api/analysis/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    console.log('Requested Analysis ID:', id);
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ success: false, message: 'Analysis not found' });

    const ResumeAnalysis = require('./models/ResumeAnalysis');
    const doc = await ResumeAnalysis.findById(id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Analysis not found' });
    if (doc.userId && req.user && String(doc.userId) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Forbidden' });
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('analysis GET error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Debug (unprotected) fetch for smoke tests only
app.get('/api/debug/analysis/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const RA = require('./models/ResumeAnalysis');
    const doc = await RA.findById(id).lean();
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('debug get analysis error', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// 🔥 Groq setup
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});


// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("Mongo Error ❌", err));


// 🔥 Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });


// ✅ Test route
app.get('/', (req, res) => {
  res.send("Server running 🚀");
});


// 🚀 MAIN API
// Accept resume (required) and optional jd (file) for extended analysis
app.post('/api/analyze', upload.fields([{ name: 'resume', maxCount: 1 }, { name: 'jd', maxCount: 1 }]), async (req, res) => {
  try {
    // DEBUG: inspect incoming multipart payload
    console.log('--- /api/analyze incoming ---')
    console.log('FILES:', req.files)
    console.log('BODY:', req.body)
    console.log('req.files summary:', Object.keys(req.files || {}).reduce((acc, k) => ({ ...acc, [k]: (req.files[k] || []).map(f => ({ originalname: f.originalname, filename: f.filename, path: f.path, size: f.size })) }), {}))
    // ----------------------------
    // Use fields-style files: resume and jd. Also accept alternative shapes (single-file uploads)
   // ==============================
// FILE EXTRACTION
// ==============================

let resumeFile = null
let jdFile = null

console.log("========== MULTER DEBUG ==========")
console.log("REQ.BODY:", req.body)
console.log("REQ.FILE:", req.file)
console.log("REQ.FILES:", req.files)

// Resume upload
if (
  req.files &&
  req.files.resume &&
  Array.isArray(req.files.resume) &&
  req.files.resume.length > 0
) {
  resumeFile = req.files.resume[0]
}

// JD upload
if (
  req.files &&
  req.files.jd &&
  Array.isArray(req.files.jd) &&
  req.files.jd.length > 0
) {
  jdFile = req.files.jd[0]
}

console.log("RESUME FILE:", resumeFile)
console.log("JD FILE:", jdFile)

// VALIDATION
if (!resumeFile) {

  console.log("❌ Resume file missing")
  console.log("FULL req.files:", req.files)

  return res.status(400).json({
    success: false,
    error: "Resume file not received by backend"
  })
}

if (!resumeFile.path) {

  console.log("❌ Resume path missing")
  console.log("Resume object:", resumeFile)

  return res.status(400).json({
    success: false,
    error: "Resume path missing"
  })
}

const { filename, path: filePath } = resumeFile

console.log("✅ File saved at:", filePath)

    // ==============================
    // UNIVERSAL FILE PARSER
    // ==============================
    async function extractText(filePath) {
      console.log('Extracting text from:', filePath)
      try {
        if (!filePath || !fs.existsSync(filePath)) {
          console.warn('extractText: file does not exist', filePath)
          return { success: false, message: 'File missing' }
        }

        const stats = fs.statSync(filePath)
        console.log('File stats:', { size: stats.size })
        if (!stats.size || stats.size <= 0) {
          return { success: false, message: 'Empty file' }
        }

        const ext = path.extname(filePath).toLowerCase();
        console.log('Extension:', ext)

        // PDF handling (robust, multi-attempt)
        if (ext === '.pdf') {
          const dataBuffer = fs.readFileSync(filePath)
          console.log('PDF size:', dataBuffer.length)
          if (!dataBuffer || dataBuffer.length < 64) {
            return { success: false, message: 'Corrupted or too-small PDF' }
          }

          // Try primary parse and several fallbacks before giving up
          let text = ''
          try {
            const data = await pdfParse(dataBuffer)
            text = data && data.text ? String(data.text || '') : ''
            if (text) console.log('PDF parse primary extracted chars:', text.length)
          } catch (primaryErr) {
            console.error('PDF primary parse error:', primaryErr && primaryErr.message ? primaryErr.message : primaryErr)
            // continue to fallback attempts
          }

          // If empty, attempt with safer options
          if (!text || !text.trim()) {
            try {
              const data2 = await pdfParse(dataBuffer, { max: 0 })
              text = data2 && data2.text ? String(data2.text || '') : ''
              if (text) console.log('PDF parse fallback-extracted chars:', text.length)
            } catch (fallbackErr) {
              console.error('PDF fallback parse error:', fallbackErr && fallbackErr.message ? fallbackErr.message : fallbackErr)
            }
          }

          // Final fallback: try a raw buffer-to-text heuristic (latin1) to salvage some content
          if (!text || !text.trim()) {
            try {
              const alt = dataBuffer.toString('latin1').replace(/[^\x20-\x7E\n]+/g, ' ').replace(/\s+/g, ' ').trim()
              if (alt && alt.length > 32) {
                console.log('PDF raw-latin1 heuristic extracted chars:', alt.length)
                text = alt
              }
            } catch (heuristicErr) {
              console.error('PDF heuristic extraction error:', heuristicErr && heuristicErr.message ? heuristicErr.message : heuristicErr)
            }
          }

          // Normalize and validate
          if (!text || !text.trim()) {
            console.warn('PDF parsed but no readable text found (likely scanned/image PDF)')
            return { success: false, message: 'This PDF contains no readable text. It may be scanned or image-based.' }
          }

          const cleaned = String(text).replace(/\u00A0/g, ' ').replace(/[\t\r]+/g, '\n').replace(/\s+/g, ' ').trim()
          console.log('PDF parse success. Extracted chars (cleaned):', cleaned.length)
          return { success: true, text: cleaned }
        }

        // TXT
        if (ext === '.txt') {
          try {
            const text = fs.readFileSync(filePath, 'utf8') || ''
            if (!text || !text.trim()) {
              return { success: false, message: 'No readable text found in TXT file.' }
            }
            const cleaned = String(text).replace(/\u00A0/g, ' ').replace(/\r/g, '\n').replace(/\s+/g, ' ').trim()
            return { success: true, text: cleaned }
          } catch (txtErr) {
            console.error('txt read error for', filePath, txtErr && txtErr.message ? txtErr.message : txtErr)
            return { success: false, message: 'Failed to read TXT file.' }
          }
        }

        // DOCX via mammoth
        if (ext === '.docx') {
          try {
            const mammoth = require('mammoth')
            const result = await mammoth.extractRawText({ path: filePath })
            let text = result && result.value ? String(result.value || '') : ''
            if (text) {
              text = text.replace(/\u00A0/g, ' ').replace(/[\t\r]+/g, '\n').replace(/\s+/g, ' ').trim()
            }

            if (!text || !text.trim()) {
              return { success: false, message: 'No readable text found in DOCX file.' }
            }
            return { success: true, text }
          } catch (docxErr) {
            console.error('mammoth error for', filePath, docxErr && docxErr.message ? docxErr.message : docxErr)
            return { success: false, message: 'Failed to extract text from DOCX file.' }
          }
        }

        if (ext === '.doc') {
          return { success: false, message: 'Old .doc format is not supported. Please upload PDF, DOCX or TXT.' }
        }

        return { success: false, message: 'Unsupported file type. Please upload PDF, DOCX or TXT.' }
      } catch (err) {
        console.error('extractText error:', err && err.message ? err.message : err)
        return { success: false, message: 'Failed to extract text from file.' }
      }
    }

    // ==============================
    // PARSE RESUME
    // ==============================
    let rawText = '';

    const parsed = await extractText(filePath);
    if (!parsed || parsed.success === false) {
      // Return friendly message for missing readable text without crashing
      const msg = parsed && parsed.message ? parsed.message : 'Failed to parse file. Upload PDF, DOCX, DOC or TXT.';
      return res.status(400).json({ success: false, message: msg });
    }

    rawText = parsed.text || '';

    const text = rawText.toLowerCase();

    // Improved ATS scoring and skill extraction (deterministic heuristics)
    const skillKeywords = [
      "JavaScript", "React", "Node.js", "Express", "REST", "GraphQL",
      "SQL", "Postgres", "MySQL", "MongoDB", "NoSQL",
      "Python", "Django", "Flask", "TensorFlow", "PyTorch",
      "HTML", "CSS", "TypeScript", "AWS", "Docker", "Kubernetes",
      "Redis", "RabbitMQ", "Kafka", "CI/CD", "Jenkins"
    ];

    const lower = text;

    const skills = skillKeywords.filter(skill => lower.includes(skill.toLowerCase()));

    // Extract simple structural signals for recruiter readability and completeness
    const hasHeading = (h) => lower.includes(h.toLowerCase());
    const sectionsFound = [
      hasHeading('experience'), hasHeading('projects'), hasHeading('skills'), hasHeading('education'), hasHeading('summary')
    ].filter(Boolean).length;

    const bulletCount = (rawText.match(/\n\s*[-•\*\d] /g) || []).length;

    // Optional JD handling (text or uploaded file) - reuse extractText helper
    let jdText = '';
    if (req.body && req.body.jdText) {
      jdText = String(req.body.jdText || '').trim();
    } else if (jdFile) {
      try {
        const jdPath = jdFile.path;
        const parsedJd = await extractText(jdPath);
        if (parsedJd && parsedJd.success) {
          jdText = parsedJd.text || '';
        } else {
          console.warn('JD upload present but no readable text:', parsedJd && parsedJd.message);
          jdText = '';
        }
      } catch (e) {
        console.warn('Failed to parse JD file:', e && e.message ? e.message : e);
        jdText = '';
      }
    }

    // JD keywords and matching (computed after jdText is finalized)
    const jdLower = (jdText || '').toLowerCase();
    const jdCandidates = jdLower ? skillKeywords.filter(k => jdLower.includes(k.toLowerCase())) : [];
    const matchedSkills = skills.filter(s => jdLower && jdLower.includes(s.toLowerCase()));
    const missingSkills = jdCandidates.filter(k => !matchedSkills.includes(k));

    // Skill match ratio (0-1)
    const skillMatchRatio = jdCandidates.length ? (matchedSkills.length / jdCandidates.length) : (skills.length ? Math.min(1, skills.length / 6) : 0);

    // Readability score (0-1) based on sections and bullets
    const readabilityRatio = Math.min(1, (sectionsFound / 4) + Math.min(1, bulletCount / 6));

    // Project alignment score (0-1) heuristic: presence of project keywords
    const projectSignals = ['project', 'built', 'developed', 'launched', 'deployed', 'integrated']
    const projectRatio = projectSignals.reduce((acc, s) => acc + (lower.includes(s) ? 1 : 0), 0) / projectSignals.length;

    // Compose ATS score deterministically and cap it to a realistic maximum (no unrealistic 95-100 values)
    // Base floor to avoid showing overly optimistic values for minimal resumes
    let computed = 40;
    computed += skillMatchRatio * 40; // up to +40
    computed += readabilityRatio * 12; // up to +12
    computed += projectRatio * 8; // up to +8

    // Penalize for missing required JD skills
    if (missingSkills.length) {
      const penalty = Math.min(12, missingSkills.length * 4);
      computed -= penalty;
    }

    // Finalize and clamp between 30 and 88 (88 = realistic top)
    let atsScore = Math.round(Math.max(30, Math.min(88, computed)));

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

    // Matching system: matched skills, missing skills, weighted match score
    let matchScore = null;
    if (jdLower && jdLower.length > 0) {
      matchScore = jdCandidates.length > 0 ? Math.round((matchedSkills.length / jdCandidates.length) * 100) : 0;
      // apply weighted penalties for missing high-value skills (DBs, core tech)
      const important = ['react', 'node', 'mongodb', 'python', 'sql']
      const missingImportant = important.filter(i => jdLower.includes(i) && !lower.includes(i))
      if (missingImportant.length) matchScore = Math.max(0, matchScore - missingImportant.length * 12)
    }

    // Simple strengths/weaknesses heuristics
    const strengths = matchedSkills.slice(0, 8);
    const weaknesses = missingSkills.slice(0, 8);

    // Save initial DB entry for AI polling (preserve existing model)
    await AIResult.create({ filename, status: 'processing' });

    // Save extended analysis (optional user association if token provided)
    try {
      const ResumeAnalysis = require('./models/ResumeAnalysis');
      // attach userId if provided via auth header
      let userId = null;
      try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'devsecret');
          userId = decoded.id;
        }
      } catch (e) {
        // ignore token parse errors; do not break analysis
      }

      // Save and capture created document to return analysis id to frontend
  const created = await ResumeAnalysis.create({
  userId,

  filename,

  resumeUrl: `/uploads/${filename}`,

  resumeText: rawText,

  jdText,

  atsScore,

  matchScore,

  skills: skills || [],

  matchedSkills: matchedSkills || [],

  missingSkills: missingSkills || [],

  strengths: strengths || [],

  weaknesses: weaknesses || [],

  feedback: {
    suggestions: [
      "Add measurable achievements in projects.",
      "Improve resume summary with role-specific keywords.",
      "Add more technical project impact metrics.",
      "Include deployment/cloud experience.",
      "Optimize formatting for ATS readability."
    ],

    strengths: strengths || [],

    weaknesses: weaknesses || []
  },

  aiFeedback:
    Array.isArray(feedback)
      ? feedback.join('\n')
      : 'AI analysis completed.'
})

      // expose created id for frontend navigation to recruiter simulation
      // (store on local variable to include in response)
      var createdAnalysisId = created && created._id ? String(created._id) : null;
    } catch (e) {
      console.warn('ResumeAnalysis save failed:', e.message);
    }

    const encodedFilename = encodeURIComponent(filename);

    // Ensure we have the created analysis id (robust lookup if needed)
    try {
      if (!createdAnalysisId) {
        const RA = require('./models/ResumeAnalysis');
        const found = await RA.findOne({ filename }).select('_id').lean();
        if (found && found._id) createdAnalysisId = String(found._id);
      }
    } catch (e) {
      // ignore
    }

    // Fast response (preserve old fields) and extend safely with new fields
    res.json({
      success: true,
      filename: encodedFilename,
      resumeUrl: `/uploads/${filename}`,
      atsScore,
      skills,
      feedback,
      aiFeedback: 'Processing...',
      summaryText: rawText.slice(0, 300),
      matchScore,
      matchedSkills,
      missingSkills,
      strengths,
      weaknesses,
      analysisId: createdAnalysisId || null
    });

    // Deterministic background heuristics to ensure fields are populated (no hallucination)
    setTimeout(async () => {
      try {
        const RA = require('./models/ResumeAnalysis');

        const lower = rawText.toLowerCase();

        // Innovation Index: detect AI/ML, NLP, CV, automation, SaaS indicators
        const innovationKeywords = ['machine learning','ml','deep learning','neural network','nlp','computer vision','yolo','tensorflow','pytorch','automation','saas','api integration','microservice','ai','data science','predictive']
        const innovationHits = innovationKeywords.filter(k => lower.includes(k)).length
        const innovationIndex = Math.min(100, Math.round((innovationHits / innovationKeywords.length) * 100))
        let innovationCommentary = ''
        if (innovationIndex >= 60) innovationCommentary = 'Strong innovation potential through AI/ML or automation projects.'
        else if (innovationIndex >= 30) innovationCommentary = 'Some innovation signals: mentions of automation, APIs, or ML-related work.'
        else innovationCommentary = 'Little explicit innovation-focused work detected.'

        // Interview readiness heuristics (percentage 0-100)
        const frontendKs = ['react','vue','angular','html','css','javascript','typescript']
        const backendKs = ['node','express','django','flask','rest','graphql','api']
        const aiKs = ['python','tensorflow','pytorch','ml','machine learning','nlp']

        const frontendScore = Math.min(100, Math.round((frontendKs.filter(k => lower.includes(k)).length / frontendKs.length) * 100))
        const backendScore = Math.min(100, Math.round((backendKs.filter(k => lower.includes(k)).length / backendKs.length) * 100))
        const aiScore = Math.min(100, Math.round((aiKs.filter(k => lower.includes(k)).length / aiKs.length) * 100))

        // HR readiness: look for leadership/communication signals
        const hrSignals = ['led','managed','mentored','presented','collaborat','communicat','team']
        const hrScore = Math.min(100, Math.round((hrSignals.filter(k => lower.includes(k)).length / hrSignals.length) * 100))

        // Confidence and weak areas extraction (keywords)
        const confidenceAreas = []
        if (frontendScore > 50) confidenceAreas.push('Frontend')
        if (backendScore > 50) confidenceAreas.push('Backend')
        if (aiScore > 50) confidenceAreas.push('AI/ML')
        if (hrScore > 40) confidenceAreas.push('Leadership/Communication')

        const weakAreas = []
        if (frontendScore <= 50) weakAreas.push('Frontend')
        if (backendScore <= 50) weakAreas.push('Backend')
        if (aiScore <= 50) weakAreas.push('AI/ML')
        if (hrScore <= 40) weakAreas.push('Leadership/Communication')

        // Likely role-specific questions (non-hallucinated templates based on detected tech)
        const likelyQuestions = []
        if (lower.includes('react')) {
          likelyQuestions.push('Explain how React component state and props differ and when to use each.')
          likelyQuestions.push('How do you optimize React application performance?')
        }
        if (lower.includes('node')) {
          likelyQuestions.push('Explain the Node.js event loop and how it affects concurrency.')
          likelyQuestions.push('How would you design a RESTful API with authentication?')
        }
        if (lower.includes('mongodb') || lower.includes('sql') || lower.includes('postgres')) {
          likelyQuestions.push('Describe normalization vs denormalization and when to use each.')
        }
        if (lower.includes('jwt') || lower.includes('authentication')) {
          likelyQuestions.push('Explain JWT authentication and common security considerations.')
        }
        if (lower.includes('tensorflow') || lower.includes('pytorch') || lower.includes('ml')) {
          likelyQuestions.push('Describe an ML pipeline you have worked on and how you evaluated model performance.')
        }

        // Final recruiter-style fallback verdict (conservative, based only on parsed text)
        const verdictParts = []
        if (confidenceAreas.length) verdictParts.push(`Candidate demonstrates strengths in ${confidenceAreas.join(', ')}.`)
        if (weakAreas.length) verdictParts.push(`Areas for improvement: ${weakAreas.join(', ')}.`)
        if (missingSkills && missingSkills.length) verdictParts.push(`Missing keywords from JD: ${missingSkills.slice(0,5).join(', ')}.`)
        const finalRecruiterVerdict = verdictParts.join(' ')

        // Save deterministic fields back to DB (do not overwrite richer AI fields if already set later)
        const update = {
          innovationIndex: innovationIndex || 0,
          innovationCommentary,
          interviewReadiness: {
            technical: Math.round((frontendScore + backendScore + aiScore) / 3),
            frontend: frontendScore,
            backend: backendScore,
            ai_ml: aiScore
          },
          hrReadiness: hrScore,
          confidenceAreas,
          weakAreas,
          likelyQuestions,
          finalInterviewPrediction: finalRecruiterVerdict
        }

        await RA.findByIdAndUpdate(createdAnalysisId, { $set: update }, { new: true });
      } catch (e) {
        console.error('Deterministic heuristics background failed:', e && e.message ? e.message : e)
      }
    }, 500);

    // 🔥 Background AI
    setTimeout(async () => {
      try {
        console.log("🚀 AI STARTED:", filename);

        const limitedText = rawText.slice(0, 3000);

        // Build a structured prompt that requests JSON output with strengths, weaknesses, and top 5 suggestions
        const structuredInstructions = `Return a JSON object ONLY with exactly three keys: strengths, weaknesses, suggestions.\n` +
          `- strengths: array of 3-5 concise strengths about the resume (do NOT repeat skill lists).\n` +
          `- weaknesses: array of 3 concise weaknesses or gaps (missing metrics, missing keywords, weak summaries).\n` +
          `- suggestions: array of up to 5 concise actionable suggestions (max 2 lines each).\n` +
          `Do NOT include any headings, markdown, explanations or extra text. Return only valid JSON.\n`;

        const promptBase = jdText && jdText.length > 0
          ? `${structuredInstructions}Compare the JOB DESCRIPTION and the RESUME. Job Description:\n${jdText}\n\nResume:\n${limitedText}`
          : `${structuredInstructions}Analyze the RESUME and produce the JSON based on the resume text:\n${limitedText}`;

        let aiRaw = ""

        if (process.env.AI_PROVIDER === "groq") {
          const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: promptBase }]
          });

          aiRaw = completion.choices[0].message.content;
        } else {
          const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "phi3:mini",
              prompt: promptBase,
              stream: false
            })
          });

          const data = await response.json();
          aiRaw = data.response || "";
        }

        // Try to parse JSON directly
        let aiStructured = null
        try {
          // Some models may include stray text before/after JSON — try to extract JSON substring
          const jsonStart = aiRaw.indexOf('{')
          const jsonEnd = aiRaw.lastIndexOf('}')
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const maybeJson = aiRaw.slice(jsonStart, jsonEnd + 1)
            aiStructured = JSON.parse(maybeJson)
          }
        } catch (e) {
          aiStructured = null
        }

        // Fallback: attempt to clean and extract lists from raw text
        if (!aiStructured) {
          const lines = aiRaw.split(/\r?\n/).map(l => l.replace(/^\s*[-\d\.|•\*]+\s*/, '').trim()).filter(Boolean)
          // Heuristic: treat first 3 lines as strengths if they look short, next 3 as weaknesses, rest as suggestions
          const strengths = lines.slice(0, 3)
          const weaknesses = lines.slice(3, 6)
          const suggestions = lines.slice(6, 11).slice(0,5)
          aiStructured = { strengths, weaknesses, suggestions }
        }

        // Ensure arrays and limits
        aiStructured.strengths = (aiStructured.strengths || []).slice(0,5).map(s => String(s).trim()).filter(Boolean)
        aiStructured.weaknesses = (aiStructured.weaknesses || []).slice(0,5).map(s => String(s).trim()).filter(Boolean)
        aiStructured.suggestions = (aiStructured.suggestions || []).slice(0,5).map(s => String(s).trim()).filter(Boolean)

        // Persist structured ai feedback as JSON string for frontend parsing
        // Persist structured ai feedback as JSON string for frontend parsing
const aiFeedback = JSON.stringify(aiStructured)

const ResumeAnalysis = require('./models/ResumeAnalysis')

// SAVE AI GENERATED VALUES INTO MAIN ANALYSIS DOCUMENT
await ResumeAnalysis.findOneAndUpdate(
  { filename },
  {
    $set: {
      strengths: aiStructured.strengths || [],

      weaknesses: aiStructured.weaknesses || [],

      feedback: {
        suggestions: aiStructured.suggestions || [],
        strengths: aiStructured.strengths || [],
        weaknesses: aiStructured.weaknesses || []
      },

      aiFeedback
    }
  },
  { new: true }
)

// KEEP AIResult UPDATE ALSO
await AIResult.findOneAndUpdate(
  { filename },
  {
    status: "done",
    aiFeedback
  }
)

console.log("🔥 AI STORED:", filename);

      } catch (err) {
        console.error("AI ERROR:", err.message);

        await AIResult.findOneAndUpdate(
          { filename },
          { status: "done", aiFeedback: "AI failed" }
        );
      }
    }, 0);

    // Background recruiter simulation (separate, may run in parallel)
    setTimeout(async () => {
      try {
        const ResumeAnalysis = require('./models/ResumeAnalysis');

        const limitedText = rawText.slice(0, 4000);

        const recruiterPrompt = `You are a senior technical recruiter / hiring manager. Analyze the RESUME and the optional JOB DESCRIPTION (if provided) and the ATS results.
Return a strict JSON ONLY with these keys: recruiterImpression (string), hiringProbability (number 0-100), interviewChance ("Low"|"Medium"|"High"), positiveSignals (array of strings), recruiterConcerns (array of strings), resumePersonality (object with technicalDepth, leadership, communication, businessImpact numeric scores 0-10), finalVerdict (string), recruiterConfidence (number 0-100), companyFit (string), technicalDepth (number 0-10), leadershipScore (number 0-10), communicationScore (number 0-10), businessImpactScore (number 0-10).
Do NOT include any explanation or extra text. Provide valid JSON only.

JOB_DESCRIPTION:\n${jdText || ''}\n\nRESUME:\n${limitedText}\n\nATS_SCORE:${atsScore}\nMATCH_SCORE:${matchScore || 0}\n`;

        let aiRaw2 = "";

        if (process.env.AI_PROVIDER === "groq") {
          const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: recruiterPrompt }]
          });

          aiRaw2 = completion.choices[0].message.content;
        } else {
          const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "phi3:mini", prompt: recruiterPrompt, stream: false })
          });

          const data = await response.json();
          aiRaw2 = data.response || "";
        }

        // parse JSON substring
        let parsedRecruiter = null;
        try {
          const s = aiRaw2.indexOf('{');
          const e = aiRaw2.lastIndexOf('}');
          if (s !== -1 && e !== -1 && e > s) {
            parsedRecruiter = JSON.parse(aiRaw2.slice(s, e + 1));
          }
        } catch (e) {
          parsedRecruiter = null;
        }

        if (!parsedRecruiter) {
          // best-effort extraction heuristics
          parsedRecruiter = {
            recruiterImpression: '',
            hiringProbability: null,
            interviewChance: '',
            positiveSignals: [],
            recruiterConcerns: [],
            resumePersonality: { technicalDepth: null, leadership: null, communication: null, businessImpact: null },
            finalVerdict: '',
            recruiterConfidence: null,
            companyFit: '',
            technicalDepth: null,
            leadershipScore: null,
            communicationScore: null,
            businessImpactScore: null
          };
        }

        // normalize numeric fields
        const normalizeNumber = (v) => {
          if (v === null || v === undefined) return null;
          const n = Number(String(v).replace('%', '').trim());
          if (Number.isFinite(n)) return n;
          return null;
        };

        const update = {
          recruiterImpression: parsedRecruiter.recruiterImpression || parsedRecruiter.recruiter_impression || '',
          recruiterConcerns: parsedRecruiter.recruiterConcerns || parsedRecruiter.recruiter_concerns || parsedRecruiter.concerns || [],
          positiveSignals: parsedRecruiter.positiveSignals || parsedRecruiter.positive_signals || [],
          hiringProbability: normalizeNumber(parsedRecruiter.hiringProbability || parsedRecruiter.hiring_probability),
          recruiterConfidence: normalizeNumber(parsedRecruiter.recruiterConfidence || parsedRecruiter.recruiter_confidence),
          resumePersonality: parsedRecruiter.resumePersonality || parsedRecruiter.resume_personality || parsedRecruiter.personality || {},
          interviewChance: parsedRecruiter.interviewChance || parsedRecruiter.interview_chance || parsedRecruiter.interview || '',
          companyFit: parsedRecruiter.companyFit || parsedRecruiter.company_fit || '',
          technicalDepth: normalizeNumber(parsedRecruiter.technicalDepth || parsedRecruiter.technical_depth || (parsedRecruiter.resumePersonality && parsedRecruiter.resumePersonality.technicalDepth)),
          leadershipScore: normalizeNumber(parsedRecruiter.leadershipScore || parsedRecruiter.leadership_score || (parsedRecruiter.resumePersonality && parsedRecruiter.resumePersonality.leadership)),
          communicationScore: normalizeNumber(parsedRecruiter.communicationScore || parsedRecruiter.communication_score || (parsedRecruiter.resumePersonality && parsedRecruiter.resumePersonality.communication)),
          businessImpactScore: normalizeNumber(parsedRecruiter.businessImpactScore || parsedRecruiter.business_impact_score || (parsedRecruiter.resumePersonality && parsedRecruiter.resumePersonality.businessImpact)),
          finalVerdict: parsedRecruiter.finalVerdict || parsedRecruiter.final_verdict || parsedRecruiter.finalVerdict || ''
        };

        // update ResumeAnalysis by filename
        await ResumeAnalysis.findOneAndUpdate({ filename }, { $set: update }, { new: true });

      } catch (err) {
        console.error('Recruiter AI ERROR:', err && err.message ? err.message : err);
      }
    }, 2000);

  } catch (err) {
    console.error('❌ ANALYZE ERROR:', err && err.stack ? err.stack : err);
    const msg = err && err.message ? err.message : 'Server error'
    res.status(500).json({ error: msg });
  }
});

// Generate optimized resume (PDF/DOCX/TEX) from existing analysis
app.post('/api/generate-optimized-resume/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const format = req.body && req.body.format ? String(req.body.format).toLowerCase() : 'pdf';
    console.log('Generate optimized resume for:', id, 'format:', format);

    const RA = require('./models/ResumeAnalysis');
    const doc = await RA.findById(id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Analysis not found' });

    if (doc.userId && req.user && String(doc.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Build an optimized resume text conservatively (do NOT invent facts)
    const original = String(doc.resumeText || '')
    const jd = String(doc.jdText || '')

    // Basic safe transformation: create concise summary, bulletize project/experience lines
    // and include missing JD keywords in the Skills section (as suggestions only).
    const lines = original.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

    const summary = (lines.slice(0, 4).join(' ')).slice(0, 500)

    const skills = Array.isArray(doc.matchedSkills) ? doc.matchedSkills.slice() : []
    const missing = Array.isArray(doc.missingSkills) ? doc.missingSkills.slice() : []
    // Avoid fabricating skills — add missing keywords into Skills section only if not present (as recommendations)
    const suggestedSkills = missing.filter(s => !skills.includes(s))

    // By default, build a conservative template. If Groq is available, ask Groq to rewrite
    let optimized = ''

    // Strict recruiter-grade optimization prompt: preserve facts, forbid invention
    const optimizationPrompt = `You are an expert ATS recruiter and resume optimization assistant.\n\n` +
      `Improve the provided resume ONLY using information already present.\n` +
      `Do NOT invent experience, achievements, internships, metrics, or skills.\n\n` +
      `Goals:\n- Improve ATS compatibility\n- Improve recruiter readability\n- Improve JD alignment\n- Improve keyword optimization\n- Improve project summaries and professional summary\n- Preserve candidate identity and original factual content\n\n` +
      `Inputs:\n- RESUME_TEXT:\n${original}\n\n- JOB_DESCRIPTION:\n${jd}\n\n- ATS_WEAKNESSES:\n${(doc.weaknesses || []).slice(0,10).join('; ')}\n\n- RECRUITER_CONCERNS:\n${(doc.recruiterConcerns || []).slice(0,10).join('; ')}\n\n- MISSING_KEYWORDS:\n${(doc.missingSkills || []).slice(0,20).join(', ')}\n\n` +
      `Requirements for output:\n1) Return ONLY the optimized resume text (no commentary, no JSON, no extra sections).\n2) Preserve all original factual content; only improve wording, structure, clarity and formatting.\n3) Use proper resume structure with headings and bullet points: Header, Summary, Skills, Projects, Experience, Education.\n4) Improve Skills section using only existing skills; if keywords are missing, include a single 'Suggested Keywords' line (do not fabricate skills in Experience).\n5) For Experience/Projects, convert long paragraphs into concise bullet points focusing on impact and responsibilities without inventing metrics.\n6) Maintain original layout cues where possible; do not fabricate any company, date, role, or metric.\n7) At the top include a single parenthetical change-note (one sentence) describing what was improved.\n\n` +
      `Now output the optimized resume text.`

    // If Groq is configured, prefer it for higher-quality rewriting
    if (process.env.AI_PROVIDER === 'groq') {
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: optimizationPrompt }]
        })

        const aiText = completion.choices?.[0]?.message?.content || ''
        if (aiText && aiText.trim()) {
          optimized = String(aiText)
        }
      } catch (e) {
        console.error('Groq optimized resume failed, falling back to template:', e && e.message ? e.message : e)
        optimized = ''
      }
    }

    // Fallback to conservative local template if optimized empty
    if (!optimized) {
      optimized += 'OPTIMIZED RESUME (Content preserved; suggestions applied)\n\n'
      optimized += 'Professional Summary:\n'
      optimized += summary + '\n\n'

      optimized += 'Skills (existing):\n'
      if (skills.length) {
        optimized += skills.join(', ') + '\n'
      } else {
        optimized += 'No structured skills detected.\n'
      }
      if (suggestedSkills.length) {
        optimized += '\nSuggested keywords to include for JD alignment (insert naturally in Skills/Experience):\n' + suggestedSkills.join(', ') + '\n\n'
      }

      optimized += 'Experience & Projects (original content preserved below):\n\n'
      // Show original but try to bulletize long paragraphs conservatively
      const contentPreview = lines.slice(0, 200)
      contentPreview.forEach(l => { optimized += '- ' + l.replace(/\s+/g, ' ') + '\n' })

      optimized += '\nRecruiter Observations and Suggested Edits (do NOT add facts):\n'
      if (doc.recruiterConcerns && doc.recruiterConcerns.length) {
        optimized += '- Recruiter Concerns: ' + doc.recruiterConcerns.join('; ') + '\n'
      }
      if (doc.weaknesses && doc.weaknesses.length) {
        optimized += '- ATS Weaknesses: ' + doc.weaknesses.join('; ') + '\n'
      }
      if (doc.positiveSignals && doc.positiveSignals.length) {
        optimized += '- Strengths: ' + doc.positiveSignals.join('; ') + '\n'
      }

      optimized += '\nFormatting recommendations:\n- Use clear headings (Summary, Skills, Experience, Projects, Education)\n- Use bullets with quantified impact where possible\n- Keep keywords from JD naturally in Skills and Experience sections.\n'
    }

    // Save optimized text to a file and return URL
    const fs = require('fs')
    const path = require('path')
    const uploadDir = path.join(__dirname, 'uploads')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

    const baseName = `optimized-${id}-${Date.now()}`
    if (format === 'docx') {
      // generate simple .docx using docx package
      try {
        const { Document, Packer, Paragraph, TextRun } = require('docx')
        const docx = new Document()
        const chunks = optimized.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] }))
        chunks.forEach(c => docx.addSection({ children: [c] }))
        const buffer = await Packer.toBuffer(docx)
        const outPath = path.join(uploadDir, `${baseName}.docx`)
        fs.writeFileSync(outPath, buffer)
        // store URL on doc (best-effort)
        await RA.findByIdAndUpdate(id, { $set: { optimizedResumeUrl: `/uploads/${baseName}.docx` } })
        return res.json({ success: true, url: `/uploads/${baseName}.docx` })
      } catch (e) {
        console.error('DOCX generation failed', e)
        return res.status(500).json({ success: false, message: 'DOCX generation failed' })
      }
    }

    // default: PDF generation via pdfkit
    try {
      const PDFDocument = require('pdfkit')
      const outPath = path.join(uploadDir, `${baseName}.pdf`)
      const stream = fs.createWriteStream(outPath)
      const pdfDoc = new PDFDocument({ size: 'A4', margin: 48 })
      pdfDoc.pipe(stream)

      // Simple resume renderer: recognize headings and bullets for a professional look
      const lines = String(optimized || '').split(/\r?\n/).map(l => l.replace(/\t/g, '    '))
      let yOffset = 0
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) {
          pdfDoc.moveDown(0.4)
          continue
        }

        // Heading detection
        const headingMatch = line.match(/^\s*(Professional Summary|Summary|Skills|Experience|Projects|Education|Professional Experience)[:\-]?\s*$/i)
        if (headingMatch) {
          pdfDoc.moveDown(0.4)
          pdfDoc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(headingMatch[1], { continued: false })
          pdfDoc.moveDown(0.15)
          pdfDoc.font('Helvetica').fontSize(10).fillColor('#334155')
          continue
        }

        // Bullet lines
        if (line.startsWith('- ') || line.startsWith('• ') || /^\d+\./.test(line)) {
          const clean = line.replace(/^[-•\d\.\)\s]+/, '').trim()
          pdfDoc.list([clean], { bulletIndent: 12, textIndent: 6 })
          continue
        }

        // Suggested Keywords block detection
        if (/Suggested keywords?/i.test(line)) {
          pdfDoc.moveDown(0.2)
          pdfDoc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(line)
          // following line likely contains comma separated keywords
          const next = lines[i+1] || ''
          if (next && next.indexOf(',') !== -1) {
            pdfDoc.moveDown(0.1)
            pdfDoc.font('Helvetica').fontSize(9).fillColor('#065f46').text(next)
            i++
          }
          continue
        }

        // Default body text (preserve short bullets by wrapping)
        pdfDoc.font('Helvetica').fontSize(10).fillColor('#0f172a').text(line, { align: 'left' })
      }

      pdfDoc.end()
      // wait for stream finish
      await new Promise((resolve, reject) => stream.on('finish', resolve).on('error', reject))
      await RA.findByIdAndUpdate(id, { $set: { optimizedResumeUrl: `/uploads/${baseName}.pdf` } })
      return res.json({ success: true, url: `/uploads/${baseName}.pdf` })
    } catch (e) {
      console.error('PDF generation failed', e)
      return res.status(500).json({ success: false, message: 'PDF generation failed' })
    }
  } catch (err) {
    console.error('generate-optimized-resume error', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})


// 🔥 GET RESULT
// GET AI result by analysis ID (preferred) — returns status and aiFeedback
app.get('/api/ai-result-by-id/:id', async (req, res) => {
  try {
    const id = req.params.id
    const result = await AIResult.findById(id)

    if (!result) {
      return res.json({ status: 'processing' })
    }

    return res.json({ status: result.status, aiFeedback: result.aiFeedback })
  } catch (e) {
    console.error('ai-result-by-id error', e)
    return res.status(500).json({ status: 'processing' })
  }
})

// BACKWARDS COMPAT: keep filename endpoint for older clients
app.get('/api/ai-result/:filename', async (req, res) => {
  const decodedFilename = decodeURIComponent(req.params.filename)

  const result = await AIResult.findOne({ filename: decodedFilename })

  if (!result) {
    return res.json({ status: 'processing' })
  }

  res.json({ status: result.status, aiFeedback: result.aiFeedback })
})


const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);


// DEBUG
console.log("GROQ:", process.env.GROQ_API_KEY ? "FOUND" : "MISSING");
console.log("MONGO:", process.env.MONGO_URI ? "FOUND" : "MISSING");
console.log("URI:", process.env.MONGO_URI);