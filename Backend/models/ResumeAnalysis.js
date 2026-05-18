const mongoose = require('mongoose');

const resumeAnalysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  filename: { type: String, required: true },
  resumeText: { type: String },
  jdText: { type: String },
  atsScore: { type: Number },
  matchScore: { type: Number },
  matchedSkills: { type: [String], default: [] },
  missingSkills: { type: [String], default: [] },
  skills: { type: [String], default: [] },
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] },
  feedback: {
    suggestions: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] }
  },
  aiFeedback: { type: String, default: '' }
  ,recruiterImpression: { type: String, default: '' }
  ,recruiterConcerns: { type: [String], default: [] }
  ,positiveSignals: { type: [String], default: [] }
  ,hiringProbability: { type: Number, default: null }
  ,recruiterConfidence: { type: Number, default: null }
  ,resumePersonality: {
    technicalDepth: { type: Number, default: null },
    leadership: { type: Number, default: null },
    communication: { type: Number, default: null },
    businessImpact: { type: Number, default: null }
  }
  ,interviewChance: { type: String, default: '' }
  ,companyFit: { type: String, default: '' }
  ,technicalDepth: { type: Number, default: null }
  ,leadershipScore: { type: Number, default: null }
  ,communicationScore: { type: Number, default: null }
  ,businessImpactScore: { type: Number, default: null }
  ,resumeUrl: { type: String, default: '' }
  ,optimizedResumeUrl: { type: String, default: '' }
  // Extended AI Hiring Intelligence fields
  ,innovationIndex: { type: Number, default: null }
  ,interviewReadiness: {
    technical: { type: Number, default: null },
    frontend: { type: Number, default: null },
    backend: { type: Number, default: null },
    ai_ml: { type: Number, default: null }
  }
  ,hrReadiness: { type: Number, default: null }
  ,confidenceAreas: { type: [String], default: [] }
  ,weakAreas: { type: [String], default: [] }
  ,likelyQuestions: { type: [String], default: [] }
  ,finalInterviewPrediction: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ResumeAnalysis', resumeAnalysisSchema);
