const ResumeAnalysis = require('../models/ResumeAnalysis');

exports.history = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const items = await ResumeAnalysis.find({ userId })
      .sort({ createdAt: -1 })
      .select('filename atsScore matchScore recruiterConfidence hiringProbability interviewReadiness resumeUrl optimizedResumeUrl createdAt');

    // Provide resumeUrl for downloads and include interviewReadiness summary
    const mapped = items.map(i => ({
      _id: i._id,
      analysisId: i._id,
      recruiterAnalysisId: i._id,
      filename: i.filename,
      atsScore: i.atsScore,
      matchScore: i.matchScore,
      recruiterConfidence: i.recruiterConfidence,
      hiringProbability: i.hiringProbability,
      resumeUrl: i.resumeUrl,
      optimizedResumeUrl: i.optimizedResumeUrl || '',
      interviewReadiness: i.interviewReadiness,
      createdAt: i.createdAt
    }));

    res.json({ success: true, data: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
