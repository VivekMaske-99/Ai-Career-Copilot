import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  Brain,
  Briefcase,
  FileSearch,
  MessageSquareQuote,
  Sparkles,
  Target,
  Upload,
  UserCheck,
  Zap,
} from 'lucide-react'
import Card from './Card'

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
}

const features = [
  { title: 'AI ATS Analysis', desc: 'Instant compatibility scoring tuned for modern ATS parsers and recruiter filters.', icon: FileSearch },
  { title: 'Recruiter Simulation', desc: 'See how a hiring manager might evaluate your resume before you apply.', icon: UserCheck },
  { title: 'Resume Optimization', desc: 'Generate ATS-friendly resume versions with stronger keyword alignment.', icon: Sparkles },
  { title: 'AI Hiring Intelligence', desc: 'Hiring probability, confidence signals, and recruiter-style verdicts.', icon: Brain },
  { title: 'Skill Gap Detection', desc: 'Identify matched and missing skills against real job descriptions.', icon: Target },
  { title: 'Interview Readiness', desc: 'Role-based readiness scores across frontend, backend, and AI/ML tracks.', icon: Briefcase },
]

const steps = [
  { step: '1', title: 'Upload Resume', desc: 'Add your resume and optionally paste or upload a job description.', icon: Upload },
  { step: '2', title: 'AI Analyzes Resume', desc: 'RecruitLens AI extracts skills, scores ATS fit, and runs recruiter simulation.', icon: Zap },
  { step: '3', title: 'Get Recruiter-Level Insights', desc: 'Review strengths, gaps, suggestions, and hiring intelligence in one dashboard.', icon: BarChart3 },
]

const insightCards = [
  { label: 'ATS Score', value: '82', sub: '/ 100', highlight: false },
  { label: 'Hiring Probability', value: '76%', sub: 'Strong fit', highlight: true },
  { label: 'Recruiter Confidence', value: '81%', sub: 'High signal', highlight: true },
  { label: 'Skill Match', value: '68%', sub: 'JD aligned', highlight: false },
  { label: 'Interview Readiness', value: '74%', sub: 'Frontend track', highlight: false },
]

const whyBlocks = [
  {
    title: 'Why ATS optimization matters',
    body: 'Most resumes never reach a human because ATS filters reject weak keyword alignment. RecruitLens AI surfaces the exact gaps recruiters and parsers care about.',
    points: ['Keyword density vs job description', 'Section structure and scanability', 'Measurable impact signals'],
    reverse: false,
  },
  {
    title: 'Why recruiter simulation matters',
    body: 'A high ATS score alone does not guarantee interviews. Our recruiter simulation models hiring confidence, concerns, and placement probability.',
    points: ['Hiring probability scoring', 'Recruiter confidence index', 'Role-fit narrative insights'],
    reverse: true,
  },
  {
    title: 'Why AI-driven analysis helps placements',
    body: 'Students and developers get recruiter-grade feedback in minutes, so every application is sharper and more intentional.',
    points: ['Actionable AI suggestions', 'Skill gap prioritization', 'Interview readiness breakdown'],
    reverse: false,
  },
]

const testimonials = [
  { name: 'Priya S.', role: 'CS Student, Placement Prep', quote: 'RecruitLens showed me exactly which keywords my resume was missing. My ATS score jumped in one revision cycle.' },
  { name: 'Arjun M.', role: 'Full-Stack Developer', quote: 'The recruiter simulation felt eerily accurate. I fixed weak project descriptions before my next interview round.' },
  { name: 'Neha R.', role: 'Placement Candidate', quote: 'I used the skill gap report to tailor resumes per JD. More callbacks, less guesswork.' },
]

function SectionHeading({ eyebrow, title, subtitle, dark = false }) {
  return (
    <motion.div
      className="text-center max-w-2xl mx-auto mb-12"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={fadeUp}
    >
      {eyebrow && (
        <p className={`text-sm font-semibold uppercase tracking-wider mb-3 ${dark ? 'text-green-400' : 'text-green-600'}`}>
          {eyebrow}
        </p>
      )}
      <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
      {subtitle && <p className={`text-lg ${dark ? 'text-gray-300' : 'muted'}`}>{subtitle}</p>}
    </motion.div>
  )
}

export default function HomeLandingSections() {
  return (
    <>
      <section className="section bg-gradient-to-b from-white to-green-50/30">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeading
            eyebrow="Platform"
            title="Everything you need to win placements"
            subtitle="RecruitLens AI combines ATS science, recruiter psychology, and hiring intelligence in one premium workflow."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={f.title}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                  variants={fadeUp}
                  whileHover={{ y: -6, scale: 1.02 }}
                >
                  <Card className="h-full p-6 rounded-3xl border border-gray-100 hover:border-green-200 hover:shadow-[0_12px_40px_rgba(34,197,94,0.12)] transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-400 flex items-center justify-center text-white mb-4 shadow-lg group-hover:shadow-[0_0_24px_rgba(34,197,94,0.35)] transition-shadow">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-2">{f.title}</h3>
                    <p className="muted text-sm leading-relaxed">{f.desc}</p>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeading eyebrow="Workflow" title="How it works" subtitle="Three steps from upload to recruiter-grade insights." />
          <div className="grid md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-green-200 via-green-400 to-green-200" />
            {steps.map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div key={s.step} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                  <Card className="p-6 rounded-3xl text-center h-full border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600 mb-4">
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="text-xs font-bold text-green-600 mb-2">STEP {s.step}</div>
                    <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                    <p className="muted text-sm">{s.desc}</p>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section bg-[#0f172a] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.35),transparent_50%)]" />
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <SectionHeading dark eyebrow="Preview" title="AI insights dashboard" subtitle="A premium analytics view — the same intelligence you get after every analysis." />
          <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>
            {insightCards.map((card, i) => (
              <motion.div key={card.label} variants={fadeUp} custom={i} whileHover={{ scale: 1.04 }} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 hover:border-green-400/40 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)] transition-all">
                <p className="text-xs text-gray-400 mb-2">{card.label}</p>
                <p className={`text-2xl font-bold ${card.highlight ? 'text-green-400' : 'text-white'}`}>{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
              </motion.div>
            ))}
          </motion.div>
          <motion.div className="mt-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 grid md:grid-cols-2 gap-6" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
            <div>
              <p className="text-sm text-green-400 font-semibold mb-2">Recruiter verdict</p>
              <p className="text-gray-200 text-sm leading-relaxed">Strong technical foundation with practical project signals. Recommend emphasizing measurable outcomes in experience bullets.</p>
            </div>
            <div className="flex flex-wrap gap-2 items-start">
              {['React', 'Node.js', 'ATS Ready', 'API Projects'].map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-medium border border-green-500/30">{tag}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section">
        <div className="max-w-6xl mx-auto px-4 space-y-16">
          <SectionHeading eyebrow="Why RecruitLens AI" title="Built for modern hiring pipelines" subtitle="From campus placements to experienced developer roles — get intelligence that recruiters actually use." />
          {whyBlocks.map((block, i) => (
            <motion.div key={block.title} className={`grid md:grid-cols-2 gap-10 items-center ${block.reverse ? 'md:[direction:rtl]' : ''}`} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={fadeUp} custom={i}>
              <div className={block.reverse ? 'md:[direction:ltr]' : ''}>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{block.title}</h3>
                <p className="muted mb-6 leading-relaxed">{block.body}</p>
                <ul className="space-y-3">
                  {block.points.map((p) => (
                    <li key={p} className="flex items-center gap-3 text-gray-700">
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`rounded-3xl p-8 bg-gradient-to-br from-green-50 to-white border border-green-100 shadow-lg ${block.reverse ? 'md:[direction:ltr]' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white">
                    <Brain className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-gray-900">RecruitLens Intelligence</span>
                </div>
                <div className="space-y-3">
                  {block.points.map((p, j) => (
                    <div key={p} className="h-3 rounded-full bg-green-100 overflow-hidden">
                      <motion.div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full" initial={{ width: 0 }} whileInView={{ width: `${72 - j * 12}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: j * 0.1 }} />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section bg-gray-50/80">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeading eyebrow="Social proof" title="Trusted by ambitious candidates" subtitle="Students, developers, and placement seekers use RecruitLens AI to stand out." />
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} whileHover={{ y: -4 }}>
                <div className="h-full p-6 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(15,23,42,0.06)] hover:shadow-[0_16px_48px_rgba(34,197,94,0.1)] transition-all">
                  <MessageSquareQuote className="w-8 h-8 text-green-500 mb-4 opacity-80" />
                  <p className="text-gray-700 text-sm leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs muted">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section pb-20">
        <motion.div className="max-w-4xl mx-auto px-6 py-14 md:py-16 rounded-[2rem] text-center relative overflow-hidden" initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-green-500 to-emerald-400 cta-gradient-animate" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent_55%)]" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Start Optimizing Your Resume with AI</h2>
            <p className="text-green-50 text-lg mb-8 max-w-xl mx-auto">Join RecruitLens AI and turn every application into a data-backed, recruiter-ready resume.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/analyze" className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-white text-green-700 font-semibold shadow-lg hover:scale-105 transition-transform">
                Analyze Resume <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/register" className="inline-flex items-center justify-center px-8 py-3 rounded-2xl border-2 border-white/80 text-white font-semibold hover:bg-white/10 transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="py-12 border-t border-gray-100">
        <div className="max-w-6xl mx-auto text-center muted text-sm px-4">
          © {new Date().getFullYear()} RecruitLens AI — Built for modern jobseekers
        </div>
      </footer>
    </>
  )
}
