import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.resolve(__dirname, '.attendiq-db.json');

interface PersistedDatabase {
  users: Record<string, unknown>;
  sections: unknown[];
  timetables: Record<string, unknown[]>;
  initialAttendance: Record<string, unknown[]>;
  attendanceRecords: unknown[];
  leaveRecords: unknown[];
  leavePredictions: unknown[];
  settings: Record<string, unknown>;
}

function readDb(): PersistedDatabase | null {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // Ignore file read errors and return null
  }
  return null;
}

function writeDb(data: PersistedDatabase): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Ignore file write errors
  }
}

function formatAdvisoryExplanation(
  studentName: string,
  sectionId: string,
  question: string,
  deterministicReport: string
): string {
  const firstName = (studentName || 'Student').split(' ')[0];
  return `Here is the exact calculation for your ${sectionId || 'class'} schedule, ${firstName}:\n\n${deterministicReport}\n\nTip: You can also test custom multi-day combinations anytime in the Leave Planner or What-If Simulator.`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  let geminiUnavailable = false;

  app.use(express.json({ limit: '5mb' }));

  // 1. Database state endpoints (Collections: Users, Sections, Subjects, Timetables, AttendanceRecords, LeaveRecords, LeavePredictions)
  app.get('/api/state', (_req, res) => {
    const db = readDb();
    res.json({ ok: true, data: db });
  });

  app.post('/api/state', (req, res) => {
    const payload = req.body as PersistedDatabase;
    if (payload && typeof payload === 'object') {
      writeDb(payload);
    }
    res.json({ ok: true });
  });

  // 2. Server-side Gemini Attendance Advisor Endpoint
  // Architecture: AI UNDERSTANDS QUESTION -> CALCULATION ENGINE CALCULATES RESULT -> AI EXPLAINS RESULT
  app.post('/api/advisor/ask', async (req, res) => {
    const { question, deterministicReport, studentName, sectionId, overallPercentage } =
      req.body || {};

    if (!question || !deterministicReport) {
      res.status(400).json({ error: 'Missing question or deterministicReport' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || geminiUnavailable) {
      res.json({
        answer: formatAdvisoryExplanation(
          studentName,
          sectionId,
          question,
          deterministicReport
        ),
        source: 'calculation_engine',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Student Name: ${studentName || 'Student'}
Section: ${sectionId || 'IV-ECE-A'}
Current Overall Attendance: ${overallPercentage}%
Student Question: "${question}"

Verified Calculation Engine Output (SOURCE OF MATHEMATICAL TRUTH):
${deterministicReport}

Explain this result clearly, concisely, and supportively to the student. Use the exact numbers from the Verified Calculation Engine Output above. Do not invent or recalculate any numbers.`,
        config: {
          systemInstruction:
            'You are the AttendIQ Attendance Advisor AI. You never perform independent attendance math; you strictly explain the verified numbers computed by the deterministic calculation engine. Keep your response concise, structured with bullet points where helpful, and encouraging.',
          temperature: 0.2,
        },
      });

      const text =
        response.text ||
        formatAdvisoryExplanation(studentName, sectionId, question, deterministicReport);
      res.json({ answer: text, source: 'gemini_advisor' });
    } catch {
      geminiUnavailable = true;
      res.json({
        answer: formatAdvisoryExplanation(
          studentName,
          sectionId,
          question,
          deterministicReport
        ),
        source: 'calculation_engine',
      });
    }
  });

  // 3. Vite middleware in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AttendIQ server running on http://localhost:${PORT}`);
  });
}

startServer();
