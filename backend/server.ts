/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { exec } from 'node:child_process';
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoStore } from './mongoStore';

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  if (process.env.NODE_ENV === 'production' && process.env.PORT) {
    return parseInt(process.env.PORT, 10);
  }
  return 3000;
}

const PORT = getPort();
const app = express();
app.get('/', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ResQlink Backend</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f4f7fb;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
        }
        .card {
          background: white;
          padding: 40px;
          border-radius: 15px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        h1 { color: #16a34a; }
        p { color: #444; }
        a { color: #2563eb; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>ResQlink Backend is Running!</h1>
        <p>Status: Online</p>
        <p>Database: MongoDB</p>
        <p>Database Name: resqlink</p>
        <a href="/api/health">Check Backend Health</a>
      </div>
    </body>
    </html>
  `);
});

const db = new MongoStore();
const JWT_SECRET = process.env.JWT_SECRET || 'giveconnect_jwt_secret_secure_key_2026';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --------------------------------------------------------------------------
// Authentication & Role-Based Authorization Helpers
// --------------------------------------------------------------------------
function generateToken(user: any): string {
  const roles = JSON.parse(user.roles_json || '["donor"]');
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      roles,
      activeRole: user.active_role,
      isVerified: Boolean(user.is_verified),
      organizationName: user.organization_name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please sign in.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }
    (req as any).user = decoded;
    next();
  });
}

function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = Array.isArray(user.roles) ? user.roles : [user.activeRole];
    const isAuthorized =
      userRoles.includes('admin') ||
      user.activeRole === 'admin' ||
      allowedRoles.some((r) => userRoles.includes(r) || user.activeRole === r);

    if (!isAuthorized) {
      return res.status(403).json({
        error: `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
    }
    next();
  };
}

// --------------------------------------------------------------------------
// REST API Endpoints: Health & Diagnostics
// --------------------------------------------------------------------------
app.get('/api/health', async (req: Request, res: Response) => {
  res.json({
    status: 'online',
    database: 'MongoDB',
    path: process.env.MONGODB_DB_NAME?.trim() || 'giveconnect',
    journalMode: 'MongoDB managed',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/db/stats', async (req: Request, res: Response) => {
  try {
    res.json({
      engine: 'MongoDB',
      storageMode: 'MongoDB persistent database',
      tables: await db.collectionStats(),
      fileSizeBytes: 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/collections', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    res.json({ collections: await db.collectionStats() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// Authentication Endpoints
// --------------------------------------------------------------------------

// Register User
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { name, email, password, phone, city, role, roles, organizationName, legalType } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Full name, email address, and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please sign in.' });
    }

    const assignedRoles = roles && Array.isArray(roles) && roles.length > 0 ? roles : [role || 'donor'];
    const activeRole = role || assignedRoles[0] || 'donor';
    const passwordHash = bcrypt.hashSync(password, 10);
    const userId = `usr-${Date.now()}`;

    // Insert user record with hashed password
    await db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, city, roles_json, active_role, organization_name, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      name.trim(),
      email.toLowerCase().trim(),
      passwordHash,
      phone || null,
      city || 'Bengaluru',
      JSON.stringify(assignedRoles),
      activeRole,
      organizationName || null,
      activeRole === 'donor' || activeRole === 'recipient' ? 1 : 0
    );

    // If registering as NGO, automatically create their initial NGO profile in 'Pending Verification'
    if (assignedRoles.includes('ngo')) {
      const ngoId = `ngo-prof-${Date.now()}`;
      await db.prepare(`
        INSERT INTO ngo_profiles (
          id, user_id, name, type, reg_number, address, city, state, contact_person, phone, email,
          description, beneficiaries, verification_status, submitted_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Verification', ?)
      `).run(
        ngoId,
        userId,
        organizationName || `${name}'s Organization`,
        legalType || 'Trust',
        `PENDING-REG-${Date.now().toString().slice(-4)}`,
        city ? `${city} Center` : 'Central Office',
        city || 'Bengaluru',
        'Karnataka',
        name,
        phone || '',
        email.toLowerCase().trim(),
        'Newly registered care sanctuary awaiting verification dossier inspection.',
        50,
        new Date().toISOString().split('T')[0]
      );
    }

    const newUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        city: newUser.city,
        roles: JSON.parse(newUser.roles_json),
        activeRole: newUser.active_role,
        organizationName: newUser.organization_name,
        isVerified: Boolean(newUser.is_verified),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login User
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter both your email address and password.' });
  }

  try {
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. No account found with this email.' });
    }

    const passwordMatches = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials. Please verify your password.' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        roles: JSON.parse(user.roles_json),
        activeRole: user.active_role,
        organizationName: user.organization_name,
        isVerified: Boolean(user.is_verified),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Current User Profile
app.get('/api/auth/me', authenticateToken, async (req: Request, res: Response) => {
  const decoded = (req as any).user;
  try {
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      roles: JSON.parse(user.roles_json),
      activeRole: user.active_role,
      organizationName: user.organization_name,
      isVerified: Boolean(user.is_verified),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Switch Active Role (Self-Service RBAC)
app.post('/api/auth/switch-role', authenticateToken, async (req: Request, res: Response) => {
  const decoded = (req as any).user;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ error: 'Target role is required.' });
  }

  try {
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const userRoles = JSON.parse(user.roles_json) as string[];
    // Non-admins can only switch between roles assigned to their account
    if (!userRoles.includes(role) && !userRoles.includes('admin')) {
      return res.status(403).json({
        error: `Unauthorized role switch: your account does not have the '${role}' role assigned.`,
      });
    }

    await db.prepare('UPDATE users SET active_role = ? WHERE id = ?').run(role, user.id);
    user.active_role = role;

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        roles: userRoles,
        activeRole: role,
        organizationName: user.organization_name,
        isVerified: Boolean(user.is_verified),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Seed Accounts helper for 1-Click test sign in
app.get('/api/auth/seed-users', async (req: Request, res: Response) => {
  try {
    const users = await db.prepare('SELECT id, name, email, roles_json, active_role, organization_name, is_verified FROM users').all() as any[];
    res.json({
      accounts: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        roles: JSON.parse(u.roles_json),
        activeRole: u.active_role,
        organizationName: u.organization_name,
        isVerified: Boolean(u.is_verified),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// NGO Verification Workflow Endpoints
// --------------------------------------------------------------------------

// Get NGO Status for Logged-In NGO
app.get('/api/ngo/status', authenticateToken, async (req: Request, res: Response) => {
  const decoded = (req as any).user;
  try {
    // Look up by user_id or email
    let profile = await db.prepare('SELECT * FROM ngo_profiles WHERE user_id = ?').get(decoded.id) as any;
    if (!profile) {
      profile = await db.prepare('SELECT * FROM ngo_profiles WHERE email = ?').get(decoded.email) as any;
    }

    if (!profile) {
      return res.json({ profile: null, documents: [] });
    }

    const documents = await db.prepare('SELECT id, ngo_id, doc_type, file_name, mime_type, file_size, uploaded_at FROM ngo_documents WHERE ngo_id = ?').all(profile.id) as any[];

    res.json({
      profile: {
        id: profile.id,
        userId: profile.user_id,
        name: profile.name,
        type: profile.type,
        regNumber: profile.reg_number,
        darpanId: profile.darpan_id,
        panNumber: profile.pan_number,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        contactPerson: profile.contact_person,
        phone: profile.phone,
        email: profile.email,
        description: profile.description,
        beneficiaries: profile.beneficiaries,
        focusAreas: profile.focus_areas,
        immediateNeeds: profile.immediate_needs,
        verificationStatus: profile.verification_status,
        rejectionReason: profile.rejection_reason,
        reviewedBy: profile.reviewed_by,
        reviewedAt: profile.reviewed_at,
        submittedDate: profile.submitted_date,
      },
      documents: documents.map((d) => ({
        id: d.id,
        ngoId: d.ngo_id,
        docType: d.doc_type,
        fileName: d.file_name,
        mimeType: d.mime_type,
        fileSize: d.file_size,
        uploadedAt: d.uploaded_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Register New NGO Application
app.post('/api/ngo/register', authenticateToken, async (req: Request, res: Response) => {
  const decoded = (req as any).user;
  const { name, type, regNumber, darpanId, panNumber, address, city, state, contactPerson, phone, email, description, beneficiaries, focusAreas, immediateNeeds } = req.body;

  if (!name || !regNumber || !address || !contactPerson) {
    return res.status(400).json({ error: 'Organization name, legal registration number, address, and contact person are required.' });
  }

  try {
    const ngoId = `ngo-prof-${Date.now()}`;
    await db.prepare(`
      INSERT OR REPLACE INTO ngo_profiles (
        id, user_id, name, type, reg_number, darpan_id, pan_number, address,
        city, state, contact_person, phone, email, description, beneficiaries,
        focus_areas, immediate_needs, verification_status, submitted_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Verification', ?)
    `).run(
      ngoId,
      decoded.id,
      name.trim(),
      type || 'Trust',
      regNumber.trim(),
      darpanId || null,
      panNumber || null,
      address.trim(),
      city || 'Bengaluru',
      state || 'Karnataka',
      contactPerson.trim(),
      phone || decoded.phone || '',
      email || decoded.email,
      description || '',
      beneficiaries || 50,
      focusAreas || '',
      immediateNeeds || '',
      new Date().toISOString().split('T')[0]
    );

    // Update user's organization name
    await db.prepare('UPDATE users SET organization_name = ? WHERE id = ?').run(name.trim(), decoded.id);

    res.status(201).json({ success: true, id: ngoId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Resubmit Corrected NGO Application
app.post('/api/ngo/resubmit', authenticateToken, async (req: Request, res: Response) => {
  const decoded = (req as any).user;
  const { name, type, regNumber, darpanId, panNumber, address, city, state, contactPerson, phone, description, beneficiaries, focusAreas, immediateNeeds } = req.body;

  try {
    let profile = await db.prepare('SELECT * FROM ngo_profiles WHERE user_id = ?').get(decoded.id) as any;
    if (!profile) {
      profile = await db.prepare('SELECT * FROM ngo_profiles WHERE email = ?').get(decoded.email) as any;
    }

    if (!profile) {
      return res.status(404).json({ error: 'No existing NGO dossier found to resubmit.' });
    }

    await db.prepare(`
      UPDATE ngo_profiles SET
        name = coalesce(?, name),
        type = coalesce(?, type),
        reg_number = coalesce(?, reg_number),
        darpan_id = coalesce(?, darpan_id),
        pan_number = coalesce(?, pan_number),
        address = coalesce(?, address),
        city = coalesce(?, city),
        state = coalesce(?, state),
        contact_person = coalesce(?, contact_person),
        phone = coalesce(?, phone),
        description = coalesce(?, description),
        beneficiaries = coalesce(?, beneficiaries),
        focus_areas = coalesce(?, focus_areas),
        immediate_needs = coalesce(?, immediate_needs),
        verification_status = 'Pending Verification',
        rejection_reason = NULL,
        submitted_date = ?
      WHERE id = ?
    `).run(
      name,
      type,
      regNumber,
      darpanId,
      panNumber,
      address,
      city,
      state,
      contactPerson,
      phone,
      description,
      beneficiaries,
      focusAreas,
      immediateNeeds,
      new Date().toISOString().split('T')[0],
      profile.id
    );

    res.json({ success: true, message: 'Your dossier has been resubmitted for admin verification.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload Supporting Certificate / Document
app.post('/api/ngo/documents', authenticateToken, async (req: Request, res: Response) => {
  const decoded = (req as any).user;
  const { ngoId, docType, fileName, fileDataBase64, mimeType, fileSize } = req.body;

  if (!docType || !fileName || !fileDataBase64) {
    return res.status(400).json({ error: 'Document type, file name, and file content are required.' });
  }

  try {
    let targetNgoId = ngoId;
    if (!targetNgoId) {
      const profile = await db.prepare('SELECT id FROM ngo_profiles WHERE user_id = ?').get(decoded.id) as any;
      if (profile) targetNgoId = profile.id;
    }

    if (!targetNgoId) {
      return res.status(400).json({ error: 'NGO profile not found for document attachment.' });
    }

    const docId = `doc-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    await db.prepare(`
      INSERT INTO ngo_documents (id, ngo_id, doc_type, file_name, file_data_base64, mime_type, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      docId,
      targetNgoId,
      docType,
      fileName,
      fileDataBase64,
      mimeType || 'application/pdf',
      fileSize || 0
    );

    res.status(201).json({ success: true, docId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// Admin Verification Endpoints
// --------------------------------------------------------------------------

// Admin: Get all NGO Verification Applications
app.get('/api/admin/ngos', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const rows = await db.prepare('SELECT * FROM ngo_profiles ORDER BY created_at DESC').all() as any[];

    const applications = await Promise.all(rows.map(async (r) => {
      const documents = await db.prepare('SELECT id, ngo_id, doc_type, file_name, mime_type, file_size, uploaded_at FROM ngo_documents WHERE ngo_id = ?').all(r.id) as any[];
      return {
        id: r.id,
        userId: r.user_id,
        name: r.name,
        type: r.type,
        regNumber: r.reg_number,
        darpanId: r.darpan_id,
        panNumber: r.pan_number,
        address: r.address,
        city: r.city,
        state: r.state,
        contactPerson: r.contact_person,
        phone: r.phone,
        email: r.email,
        description: r.description,
        beneficiaries: r.beneficiaries,
        focusAreas: r.focus_areas,
        immediateNeeds: r.immediate_needs,
        verificationStatus: r.verification_status,
        rejectionReason: r.rejection_reason,
        reviewedBy: r.reviewed_by,
        reviewedAt: r.reviewed_at,
        submittedDate: r.submitted_date,
        documents: documents.map((d) => ({
          id: d.id,
          ngoId: d.ngo_id,
          docType: d.doc_type,
          fileName: d.file_name,
          mimeType: d.mime_type,
          fileSize: d.file_size,
          uploadedAt: d.uploaded_at,
        })),
      };
    }));

    res.json({ applications });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Inspect / Retrieve a specific secure certificate
app.get('/api/admin/ngos/:id/documents/:docId', authenticateToken, requireRole(['admin', 'ngo']), async (req: Request, res: Response) => {
  const { id, docId } = req.params;
  try {
    const doc = await db.prepare('SELECT * FROM ngo_documents WHERE id = ? AND ngo_id = ?').get(docId, id) as any;
    if (!doc) {
      return res.status(404).json({ error: 'Verification document not found.' });
    }
    res.json({
      id: doc.id,
      ngoId: doc.ngo_id,
      docType: doc.doc_type,
      fileName: doc.file_name,
      mimeType: doc.mime_type,
      fileSize: doc.file_size,
      uploadedAt: doc.uploaded_at,
      fileDataBase64: doc.file_data_base64,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Review NGO (Approve / Reject with Reason / Under Review)
app.post('/api/admin/ngos/:id/review', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;
  const adminUser = (req as any).user;

  if (!status || !['Verified', 'Rejected', 'Under Review'].includes(status)) {
    return res.status(400).json({ error: 'Valid verification status is required (Verified, Rejected, or Under Review).' });
  }

  if (status === 'Rejected' && (!rejectionReason || !rejectionReason.trim())) {
    return res.status(400).json({ error: 'A clear rejection reason is mandatory when declining an NGO application.' });
  }

  try {
    const ngo = await db.prepare('SELECT * FROM ngo_profiles WHERE id = ?').get(id) as any;
    if (!ngo) {
      return res.status(404).json({ error: 'NGO dossier not found.' });
    }

    const reviewedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.prepare(`
      UPDATE ngo_profiles SET
        verification_status = ?,
        rejection_reason = ?,
        reviewed_by = ?,
        reviewed_at = ?
      WHERE id = ?
    `).run(
      status,
      status === 'Rejected' ? rejectionReason.trim() : null,
      adminUser.email || adminUser.name,
      reviewedAt,
      id
    );

    // If verified, update the user account verification flag and add to public directory
    if (status === 'Verified') {
      if (ngo.user_id) {
        await db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(ngo.user_id);
      }

      await db.prepare(`
        INSERT OR REPLACE INTO ngos (
          id, name, type, city, state, address, verified, contact_person, phone, email, beneficiaries, focus_areas, immediate_needs, darpan_id
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `ngo-${id}`,
        ngo.name,
        ngo.type,
        ngo.city,
        ngo.state,
        ngo.address,
        ngo.contact_person,
        ngo.phone,
        ngo.email,
        ngo.beneficiaries,
        ngo.focus_areas,
        ngo.immediate_needs,
        ngo.darpan_id
      );
    } else if (status === 'Rejected') {
      if (ngo.user_id) {
        await db.prepare('UPDATE users SET is_verified = 0 WHERE id = ?').run(ngo.user_id);
      }
    }

    res.json({ success: true, id, status, reviewedAt, reviewedBy: adminUser.email });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// Blood Bank Inventory Endpoints
// --------------------------------------------------------------------------
app.get('/api/blood-inventory', async (req: Request, res: Response) => {
  const { bloodBankId, city, bloodGroup } = req.query;
  try {
    let sql = 'SELECT * FROM blood_inventory WHERE 1=1';
    const params: any[] = [];

    if (bloodBankId) {
      sql += ' AND blood_bank_id = ?';
      params.push(bloodBankId);
    }
    if (city && city !== 'all') {
      sql += ' AND city = ?';
      params.push(city);
    }
    if (bloodGroup && bloodGroup !== 'all') {
      sql += ' AND blood_group = ?';
      params.push(bloodGroup);
    }

    sql += ' ORDER BY city ASC, blood_bank_name ASC, blood_group ASC';
    const rows = await db.prepare(sql).all(...params) as any[];

    res.json({
      inventory: rows.map((r) => ({
        id: r.id,
        bloodBankId: r.blood_bank_id,
        bloodBankName: r.blood_bank_name,
        city: r.city,
        address: r.address,
        phone: r.phone,
        emergencyPhone: r.emergency_phone,
        bloodGroup: r.blood_group,
        unitsAvailable: r.units_available,
        lastUpdated: r.last_updated,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/blood-inventory/update', authenticateToken, requireRole(['blood_bank', 'admin']), async (req: Request, res: Response) => {
  const { bloodBankId, bloodGroup, unitsAvailable } = req.body;

  if (!bloodBankId || !bloodGroup || unitsAvailable === undefined) {
    return res.status(400).json({ error: 'Blood bank ID, blood group, and unit count are required.' });
  }

  try {
    const existing = await db.prepare('SELECT * FROM blood_inventory WHERE blood_bank_id = ? AND blood_group = ?').get(bloodBankId, bloodGroup) as any;
    const now = new Date().toISOString();

    if (existing) {
      await db.prepare(`
        UPDATE blood_inventory SET units_available = ?, last_updated = ? WHERE id = ?
      `).run(Math.max(0, parseInt(unitsAvailable, 10)), now, existing.id);
    } else {
      const id = `${bloodBankId}-${bloodGroup.replace('+', 'pos').replace('-', 'neg')}`;
      await db.prepare(`
        INSERT INTO blood_inventory (id, blood_bank_id, blood_bank_name, city, blood_group, units_available, last_updated)
        VALUES (?, ?, ?, 'Bengaluru', ?, ?, ?)
      `).run(id, bloodBankId, 'Regional Blood Bank', bloodGroup, Math.max(0, parseInt(unitsAvailable, 10)), now);
    }

    const updated = await db.prepare('SELECT * FROM blood_inventory WHERE blood_bank_id = ? AND blood_group = ?').get(bloodBankId, bloodGroup) as any;
    res.json({
      success: true,
      item: {
        id: updated.id,
        bloodBankId: updated.blood_bank_id,
        bloodBankName: updated.blood_bank_name,
        city: updated.city,
        address: updated.address,
        phone: updated.phone,
        bloodGroup: updated.blood_group,
        unitsAvailable: updated.units_available,
        lastUpdated: updated.last_updated,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// Volunteer Assignments & OTP Handover Verification Endpoints
// --------------------------------------------------------------------------
app.get('/api/volunteer/missions', async (req: Request, res: Response) => {
  try {
    const rows = await db.prepare('SELECT * FROM volunteer_assignments ORDER BY created_at DESC').all() as any[];
    res.json({
      missions: rows.map((r) => ({
        id: r.id,
        title: r.title,
        volunteerId: r.volunteer_id,
        volunteerName: r.volunteer_name,
        volunteerPhone: r.volunteer_phone,
        donorName: r.donor_name,
        donorPhone: r.donor_phone,
        pickupAddress: r.pickup_address,
        pickupInstructions: r.pickup_instructions,
        recipientName: r.recipient_name,
        recipientPhone: r.recipient_phone,
        dropAddress: r.drop_address,
        dropInstructions: r.drop_instructions,
        category: r.category,
        quantity: r.quantity,
        status: r.status,
        deliveryPin: r.delivery_pin,
        otpVerified: Boolean(r.otp_verified),
        deliveredAt: r.delivered_at,
        notes: r.notes,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/volunteer/missions/:id/status', authenticateToken, requireRole(['volunteer', 'admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['assigned', 'at_pickup', 'in_transit', 'delivered'].includes(status)) {
    return res.status(400).json({ error: 'Invalid mission status.' });
  }

  try {
    await db.prepare('UPDATE volunteer_assignments SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true, id, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Volunteer: Dispatch a resource from current location / city
app.post('/api/volunteer/dispatch', authenticateToken, requireRole(['volunteer', 'admin']), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const {
    title,
    resourceId,
    donorName,
    donorPhone,
    pickupAddress,
    pickupInstructions,
    recipientName,
    recipientPhone,
    dropAddress,
    dropInstructions,
    category,
    quantity,
    speedKmh,
    totalDistanceKm,
    currentCity,
  } = req.body;

  try {
    const missionId = `mission-${Date.now()}`;
    const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();

    await db.prepare(`
      INSERT INTO volunteer_assignments (
        id, title, volunteer_id, volunteer_name, volunteer_phone,
        donor_name, donor_phone, pickup_address, pickup_instructions,
        recipient_name, recipient_phone, drop_address, drop_instructions,
        category, quantity, status, delivery_pin, otp_verified, notes
      ) VALUES (
        @id, @title, @volunteer_id, @volunteer_name, @volunteer_phone,
        @donor_name, @donor_phone, @pickup_address, @pickup_instructions,
        @recipient_name, @recipient_phone, @drop_address, @drop_instructions,
        @category, @quantity, 'in_transit', @delivery_pin, 0, @notes
      )
    `).run({
      id: missionId,
      title: title || 'Volunteer Resource Redistribution',
      volunteer_id: user.id,
      volunteer_name: user.name || 'Active Volunteer',
      volunteer_phone: user.phone || '+91 99801 33445',
      donor_name: donorName || 'Verified Resource Hub',
      donor_phone: donorPhone || '',
      pickup_address: pickupAddress || (currentCity ? `${currentCity} Dispatch Hub` : 'Mysuru APMC Yard'),
      pickup_instructions: pickupInstructions || 'Cargo loaded and secured for transit',
      recipient_name: recipientName || 'Karuna Vridhashram & Child Haven',
      recipient_phone: recipientPhone || '+91 98450 22334',
      drop_address: dropAddress || 'Lalitha Mahal Road, Mysuru',
      drop_instructions: dropInstructions || 'Deliver to on-duty sanctuary supervisor',
      category: category || 'Essential Goods',
      quantity: quantity || 'Standard Consignment',
      delivery_pin: deliveryPin,
      notes: `Dispatched from ${currentCity || 'Mysuru'} at ${speedKmh || 35} km/h (${totalDistanceKm || 12.8} km route)`,
    });

    if (resourceId) {
      await db.prepare(`
        UPDATE resources
        SET status = 'Reserved', tracking_status = 'In Transit with Volunteer'
        WHERE id = ?
      `).run(resourceId);
    }

    res.status(201).json({
      success: true,
      missionId,
      deliveryPin,
      status: 'in_transit',
      message: `Resource dispatched successfully from ${currentCity || 'Mysuru'}!`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/volunteer/missions/:id/verify-otp', authenticateToken, requireRole(['volunteer', 'admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { deliveryPin, receivedByName, notes } = req.body;

  if (!deliveryPin) {
    return res.status(400).json({ error: 'Handover verification PIN (OTP) is required.' });
  }

  try {
    const mission = await db.prepare('SELECT * FROM volunteer_assignments WHERE id = ?').get(id) as any;
    if (!mission) {
      return res.status(404).json({ error: 'Volunteer mission assignment not found.' });
    }

    if (mission.delivery_pin.trim() !== deliveryPin.trim()) {
      return res.status(400).json({ error: 'Incorrect delivery PIN. Please check with the recipient.' });
    }

    const deliveredAt = new Date().toISOString();
    await db.prepare(`
      UPDATE volunteer_assignments SET
        status = 'delivered',
        otp_verified = 1,
        delivered_at = ?,
        notes = ?
      WHERE id = ?
    `).run(deliveredAt, notes || `Delivered to ${receivedByName || 'Authorized Receiver'}`, id);

    // Also update any related resource handover
    await db.prepare(`
      UPDATE handover_requests
      SET status = 'Completed', delivery_status = 'Delivered & OTP Verified'
      WHERE resource_title = ?
    `).run(mission.title);

    res.json({
      success: true,
      message: 'Delivery successfully verified via recipient OTP!',
      deliveredAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// Resources & Handover APIs
// --------------------------------------------------------------------------
app.get('/api/resources', async (req: Request, res: Response) => {
  try {
    const rows = await db.prepare('SELECT * FROM resources ORDER BY created_at DESC').all() as any[];
    const items = rows.map((r) => ({
      id: r.id,
      donorId: r.donor_id || undefined,
      title: r.title,
      category: r.category,
      quantity: r.quantity,
      location: r.location,
      city: r.city,
      condition: r.condition,
      donorName: r.donor_name,
      donorContact: r.donor_contact,
      donorType: r.donor_type,
      urgency: r.urgency,
      expiryDate: r.expiry_date,
      status: r.status,
      pickupInstructions: r.pickup_instructions,
      postedDate: r.posted_date,
      imageUrl: r.image_url,
      photos: r.photos_json ? JSON.parse(r.photos_json) : r.image_url ? [r.image_url] : [],
      claimedByNgoName: r.claimed_by_ngo_name,
      claimedByNgoId: r.claimed_by_ngo_id,
      trackingStatus: r.tracking_status,
    }));
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/resources/mine', authenticateToken, requireRole(['donor']), async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const rows = await db.prepare(
      'SELECT * FROM resources WHERE donor_id = ? ORDER BY created_at DESC'
    ).all(user.id) as any[];
    res.json(rows.map((r) => ({
      id: r.id,
      donorId: r.donor_id,
      title: r.title,
      category: r.category,
      categoryLabel: r.category,
      quantity: r.quantity,
      location: r.location,
      locality: r.location,
      city: r.city,
      condition: r.condition,
      donorName: r.donor_name,
      donorType: r.donor_type,
      status: r.status,
      postedDate: r.posted_date,
      description: r.description || '',
      pickupAvailable: r.pickup_instructions !== 'Drop-off required',
      contactEmail: user.email,
      contactPhone: r.donor_contact,
      imageUrl: r.image_url,
      images: r.photos_json ? JSON.parse(r.photos_json) : r.image_url ? [r.image_url] : [],
      trackingStatus: r.tracking_status,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/resources', authenticateToken, requireRole(['donor']), async (req: Request, res: Response) => {
  const r = req.body;
  const user = (req as any).user;
  const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : `res-${Date.now()}`;
  if (!r.title?.trim() || !r.quantity?.trim() || !r.city?.trim() || !r.location?.trim()) {
    return res.status(400).json({ error: 'Title, quantity, city, and locality are required.' });
  }
  try {
    const stmt = await db.prepare(`
      INSERT INTO resources (
        id, title, category, quantity, location, city, condition, donor_name,
        donor_contact, donor_type, urgency, expiry_date, status, pickup_instructions,
        posted_date, image_url, photos_json, claimed_by_ngo_name, claimed_by_ngo_id, tracking_status, donor_id, description
      ) VALUES (
        @id, @title, @category, @quantity, @location, @city, @condition, @donor_name,
        @donor_contact, @donor_type, @urgency, @expiry_date, @status, @pickup_instructions,
        @posted_date, @image_url, @photos_json, @claimed_by_ngo_name, @claimed_by_ngo_id, @tracking_status, @donor_id, @description
      )
    `);

    await stmt.run({
      id,
      title: r.title,
      category: r.category,
      quantity: r.quantity,
      location: r.location,
      city: r.city,
      condition: r.condition || 'Good',
      donor_name: user.name,
      donor_contact: r.donorContact || '',
      donor_type: r.donorType || 'Individual Donor',
      urgency: r.urgency || 'Medium',
      expiry_date: r.expiryDate || null,
      status: r.status || 'Available',
      pickup_instructions: r.pickupInstructions || '',
      posted_date: r.postedDate || new Date().toISOString().split('T')[0],
      image_url: r.imageUrl || (r.photos && r.photos[0]) || '',
      photos_json: JSON.stringify(r.photos || (r.imageUrl ? [r.imageUrl] : [])),
      claimed_by_ngo_name: r.claimedByNgoName || null,
      claimed_by_ngo_id: r.claimedByNgoId || null,
      tracking_status: r.trackingStatus || null,
      donor_id: user.id,
      description: r.description || '',
    });

    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/resources/:id', authenticateToken, requireRole(['donor']), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const editableFields: Record<string, string> = {
    title: 'title',
    category: 'category',
    quantity: 'quantity',
    location: 'location',
    locality: 'location',
    city: 'city',
    condition: 'condition',
    pickupInstructions: 'pickup_instructions',
    description: 'description',
    imageUrl: 'image_url',
  };
  const updates: Record<string, string> = {};
  for (const [field, column] of Object.entries(editableFields)) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates[column] = String(req.body[field] ?? '').trim();
    }
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'photos')) {
    updates.photos_json = JSON.stringify(Array.isArray(req.body.photos) ? req.body.photos : []);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'pickupAvailable')) {
    updates.pickup_instructions = req.body.pickupAvailable ? 'Pickup available' : 'Drop-off required';
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Provide at least one donation field to update.' });
  }
  if ((updates.title !== undefined && !updates.title) ||
      (updates.quantity !== undefined && !updates.quantity) ||
      (updates.location !== undefined && !updates.location) ||
      (updates.city !== undefined && !updates.city)) {
    return res.status(400).json({ error: 'Title, quantity, city, and locality cannot be empty.' });
  }

  try {
    const resource = await db.prepare('SELECT * FROM resources WHERE id = ? AND donor_id = ?').get(id, user.id) as any;
    if (!resource) {
      return res.status(404).json({ error: 'Donation not found or you do not own it.' });
    }
    if (resource.status !== 'Available') {
      return res.status(409).json({ error: 'Only available donations can be edited.' });
    }
    const assignments = Object.keys(updates).map((column) => `${column} = @${column}`).join(', ');
    await db.prepare(`UPDATE resources SET ${assignments} WHERE id = @id AND donor_id = @donor_id`).run({
      ...updates,
      id,
      donor_id: user.id,
    });
    const updated = await db.prepare('SELECT * FROM resources WHERE id = ?').get(id) as any;
    res.json({
      success: true,
      item: {
        id: updated.id,
        donorId: updated.donor_id,
        title: updated.title,
        category: updated.category,
        categoryLabel: updated.category,
        quantity: updated.quantity,
        locality: updated.location,
        city: updated.city,
        condition: updated.condition,
        donorName: updated.donor_name,
        donorType: updated.donor_type,
        status: updated.status,
        postedDate: updated.posted_date,
        description: updated.description || '',
        pickupAvailable: updated.pickup_instructions !== 'Drop-off required',
        contactEmail: user.email,
        contactPhone: updated.donor_contact,
        imageUrl: updated.image_url,
        images: updated.photos_json ? JSON.parse(updated.photos_json) : updated.image_url ? [updated.image_url] : [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/resources/:id', authenticateToken, requireRole(['donor']), async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const resource = await db.prepare('SELECT status FROM resources WHERE id = ? AND donor_id = ?').get(req.params.id, user.id) as any;
    if (!resource) {
      return res.status(404).json({ error: 'Donation not found or you do not own it.' });
    }
    if (resource.status !== 'Available') {
      return res.status(409).json({ error: 'Only available donations can be deleted.' });
    }
    await db.prepare('DELETE FROM resources WHERE id = ? AND donor_id = ?').run(req.params.id, user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Handover requests
app.get('/api/handover-requests', async (req: Request, res: Response) => {
  try {
    const rows = await db.prepare('SELECT * FROM handover_requests ORDER BY created_at DESC').all() as any[];
    res.json(
      rows.map((r) => ({
        id: r.id,
        resourceId: r.resource_id,
        resourceTitle: r.resource_title,
        requesterId: r.requester_id,
        requesterName: r.requester_name,
        requesterType: r.requester_type,
        requesterPhone: r.requester_phone,
        requesterCity: r.requester_city,
        requestedQuantity: r.requested_quantity,
        purpose: r.purpose,
        requestDate: r.request_date,
        status: r.status,
        deliveryStatus: r.delivery_status,
        deliveryScheduledDate: r.delivery_scheduled_date,
        deliveryNotes: r.delivery_notes,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/handover-requests', async (req: Request, res: Response) => {
  const h = req.body;
  try {
    await db.prepare(`
      INSERT INTO handover_requests (
        id, resource_id, resource_title, requester_id, requester_name, requester_type,
        requester_phone, requester_city, requested_quantity, purpose, request_date,
        status, delivery_status, delivery_scheduled_date, delivery_notes
      ) VALUES (
        @id, @resource_id, @resource_title, @requester_id, @requester_name, @requester_type,
        @requester_phone, @requester_city, @requested_quantity, @purpose, @request_date,
        @status, @delivery_status, @delivery_scheduled_date, @delivery_notes
      )
    `).run({
      id: h.id || `req-${Date.now()}`,
      resource_id: h.resourceId,
      resource_title: h.resourceTitle,
      requester_id: h.requesterId || 'user-req',
      requester_name: h.requesterName,
      requester_type: h.requesterType || 'Community Recipient',
      requester_phone: h.requesterPhone || '',
      requester_city: h.requesterCity || '',
      requested_quantity: h.requestedQuantity || 'All',
      purpose: h.purpose || 'Community redistribution',
      request_date: h.requestDate || new Date().toISOString().split('T')[0],
      status: h.status || 'Submitted',
      delivery_status: h.deliveryStatus || 'Scheduled for Verification',
      delivery_scheduled_date: h.deliveryScheduledDate || null,
      delivery_notes: h.deliveryNotes || null,
    });

    await db.prepare(`
      UPDATE resources
      SET status = 'Reserved', claimed_by_ngo_name = ?, tracking_status = 'Claim Submitted'
      WHERE id = ?
    `).run(h.requesterName, h.resourceId);

    res.status(201).json({ success: true, id: h.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Blood Requests & Pledges
app.get('/api/blood-requests', async (req: Request, res: Response) => {
  try {
    const rows = await db.prepare('SELECT * FROM blood_requests ORDER BY created_at DESC').all() as any[];
    res.json(
      rows.map((r) => ({
        id: r.id,
        patientName: r.patient_name,
        bloodGroup: r.blood_group,
        unitsRequired: r.units_required,
        hospitalName: r.hospital_name,
        hospitalAddress: r.hospital_address,
        city: r.city,
        state: r.state,
        urgency: r.urgency,
        contactPerson: r.contact_person,
        contactPhone: r.contact_phone,
        postedDate: r.posted_date,
        status: r.status,
        doctorPrescriptionVerified: Boolean(r.doctor_prescription_verified),
        neededByTime: r.needed_by_time,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/blood-pledges', async (req: Request, res: Response) => {
  const p = req.body;
  try {
    await db.prepare(`
      INSERT INTO blood_pledges (
        id, request_id, donor_name, donor_phone, donor_blood_group, pledged_units, pledged_at, status
      ) VALUES (
        @id, @request_id, @donor_name, @donor_phone, @donor_blood_group, @pledged_units, @pledged_at, @status
      )
    `).run({
      id: p.id || `pledge-${Date.now()}`,
      request_id: p.requestId,
      donor_name: p.donorName,
      donor_phone: p.donorPhone,
      donor_blood_group: p.donorBloodGroup,
      pledged_units: p.pledgedUnits || 1,
      pledged_at: p.pledgedAt || new Date().toISOString(),
      status: 'Pledged',
    });

    await db.prepare(`UPDATE blood_requests SET status = 'Fulfillers Assigned' WHERE id = ?`).run(p.requestId);
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public NGOs Directory
app.get('/api/ngos', async (req: Request, res: Response) => {
  try {
    const rows = await db.prepare('SELECT * FROM ngos ORDER BY verified DESC, name ASC').all() as any[];
    res.json(
      rows.map((r) => {
        const focusList = r.focus_areas ? r.focus_areas.split(',').map((f: string) => f.trim()) : [];
        const needsList = r.immediate_needs ? r.immediate_needs.split(',').map((n: string) => n.trim()) : [];
        return {
          id: r.id,
          name: r.name,
          type: r.type || 'Ashram',
          registrationNumber: r.darpan_id || `REG-${r.id.toUpperCase()}`,
          darpanId: r.darpan_id,
          verifiedStatus: r.verified ? 'Verified' : 'Pending Verification',
          verified: Boolean(r.verified),
          city: r.city,
          state: r.state || 'Karnataka',
          address: r.address || '',
          contactPerson: r.contact_person,
          phone: r.phone || '',
          email: r.email || '',
          website: r.email ? `https://${r.email.split('@')[1]}` : undefined,
          yearEstablished: 2016,
          beneficiaryCount: r.beneficiaries || 50,
          beneficiaries: r.beneficiaries || 50,
          focusAreas: focusList.length > 0 ? focusList : ['Elderly Care', 'Community Relief'],
          activeNeeds: needsList.length > 0 ? needsList : ['Nutritional Rations', 'Blankets'],
          immediateNeeds: needsList,
          summary: `${r.name} provides dedicated community care and redistribution support in ${r.city}.`,
          headOfOrganization: r.contact_person || 'Trustee',
        };
      })
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Volunteer Tasks
app.get('/api/volunteer-tasks', async (req: Request, res: Response) => {
  try {
    const rows = await db.prepare('SELECT * FROM volunteer_tasks ORDER BY created_at DESC').all() as any[];
    res.json(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        organization: r.organizer,
        category: r.category,
        city: r.city,
        location: r.location,
        date: r.date,
        time: r.time,
        duration: r.duration,
        volunteersNeeded: r.volunteers_needed,
        volunteersRegistered: r.volunteers_registered,
        skillsRequired: r.skills_required ? r.skills_required.split(',') : [],
        description: r.description,
        urgent: Boolean(r.urgent),
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// Production frontend assets are served by the backend; development uses Vite separately.
// --------------------------------------------------------------------------
async function startServer() {
  await db.connect();

  const distPath = path.resolve(process.cwd(), 'frontend', 'dist');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
  console.log(`ResQlink Backend running at http://localhost:${PORT}`);

  if (process.env.NODE_ENV !== 'production') {
    exec('start "" http://localhost:3000/');
  }
});
}

startServer().catch((err) => {
  console.error('Failed to start server:', err instanceof Error ? err.message : err);
  process.exit(1);
});
