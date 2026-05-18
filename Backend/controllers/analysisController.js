const ResumeAnalysis = require('../models/ResumeAnalysis');

exports.getById = async (req, res) => {
  try {
    const id = req.params.id;
    console.log('Requested Analysis ID:', id);
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Analysis not found' });
    }

    const doc = await ResumeAnalysis.findById(id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Analysis not found' });

    // If the analysis belongs to a user, ensure requester user matches
    console.log('User:', req.user)
    if (doc.userId && req.user && String(doc.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Return both `data` and `analysis` to be forgiving with frontend expectations
    res.json({ success: true, data: doc, analysis: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
