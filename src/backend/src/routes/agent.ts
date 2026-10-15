import { Hono } from 'hono';
import { Env } from '../middleware/authenticate.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { createClient } from '@supabase/supabase-js';
import { normalizeVessel } from '../services/operationsService.js';

const router = new Hono<Env>();

router.use('*', authenticate, requireRole('ship-agent'));

// ─── Vessels ─────────────────────────────────────────────────────────────────

router.get('/vessels', async (c) => {
  try {
    const vessels = await c.var.prisma.vessel.findMany({
      where: { ownerId: c.var.user!.id },
      include: { timelineEvents: true },
      orderBy: { predictedWaitHours: 'desc' },
    });
    return c.json(vessels.map(normalizeVessel));
  } catch (err) {
    console.error('[agent] get vessels', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

router.get('/vessels/:id', async (c) => {
  try {
    const vessel = await c.var.prisma.vessel.findUnique({
      where: { id: c.req.param('id') },
      include: { timelineEvents: true },
    });
    if (!vessel) {
      return c.json({ error: 'Vessel not found' }, 404);
    }
    if (vessel.ownerId !== c.var.user!.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    return c.json(normalizeVessel(vessel));
  } catch (err) {
    console.error('[agent] get vessel by id', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

router.post('/vessels', async (c) => {
  try {
    const vData = await c.req.json();
    const newId = `VES-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const newVessel = await c.var.prisma.$transaction(async (tx) => {
      const vessel = await tx.vessel.create({
        data: {
          id: newId,
          name: vData.name || 'New Carrier',
          imo: vData.imo || String(Math.floor(1000000 + Math.random() * 9000000)),
          flag: vData.flag || 'Panama',
          lengthMeters: Number(vData.lengthMeters) || 300,
          draughtMeters: Number(vData.draughtMeters) || 14,
          teuCapacity: Number(vData.teuCapacity) || 12000,
          cargoVolume: Number(vData.cargoVolume) || 8000,
          origin: vData.origin || 'Singapore (SGSIN)',
          destination: vData.destination || 'Rotterdam (NLRTM)',
          eta: vData.eta || 'Tomorrow, 12:00 UTC',
          etd: vData.etd || vData.estimatedEtd || '+2 Days, 18:00 UTC (Est.)',
          status: (vData.status || 'Arriving').replace(' ', '_'),
          priority: vData.priority || 'Standard',
          assignedBerth: vData.assignedBerth || 'Unassigned',
          predictedWaitHours: 3.5,
          demurrageRisk: 'Low',
          historicalTurnaroundHours: 20,
          recommendedAction: 'Awaiting port berth assignment and pilot scheduling.',
          ownerId: c.var.user!.id,
          shippingCompany: vData.shippingCompany || 'Apex Maritime Agency',
          callSign: vData.callSign || 'CALL-' + Math.floor(100 + Math.random() * 900),
          vesselType: vData.vesselType || 'Container Ship',
          voyageNumber: vData.voyageNumber || 'VYG-' + Math.floor(1000 + Math.random() * 9000),
          previousPort: vData.previousPort || 'Busan (KRPUS)',
          nextPort: vData.nextPort || 'Hamburg (DEHAM)',
          requestedBerth: vData.requestedBerth || null,
          requestedArrivalTime: vData.requestedArrivalTime || vData.eta || 'Tomorrow, 12:00 UTC',
          berthDurationHours: Number(vData.berthDurationHours) || 20,
          requestedCranes: Number(vData.requestedCranes) || 3,
          cargoType: vData.cargoType || 'General Cargo & Containers',
          cargoQuantity: vData.cargoQuantity || '850 TEU Discharged',
          containersLoaded: Number(vData.containersLoaded) || 0,
          containersTotal: Number(vData.containersTotal) || 850,
          dangerousGoods: Boolean(vData.dangerousGoods),
          specialNotes: vData.specialNotes || '',
          timelineEvents: {
            create: [
              { stage: 'Port Notice Filed', time: 'Just now', status: 'completed' },
              { stage: 'Pilot Station Entry', time: vData.eta || 'Tomorrow 12:00 UTC', status: 'scheduled' },
              { stage: 'Berthing', time: '+1h after pilot', status: 'scheduled' },
              { stage: 'Discharge Ops', time: '+2h after berthing', status: 'scheduled' },
            ]
          }
        },
        include: { timelineEvents: true }
      });

      if (vData.requestedBerth) {
        await tx.berthRequest.create({
          data: {
            id: `BR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            vesselId: vessel.id,
            vesselName: vessel.name,
            imo: vessel.imo,
            requestedBerth: vData.requestedBerth,
            requestedArrivalTime: vessel.requestedArrivalTime || vessel.eta,
            estimatedDurationHours: vessel.berthDurationHours || 20,
            requestedCranes: vessel.requestedCranes || 3,
            cargoType: vessel.cargoType || 'Containerized Cargo',
            status: 'Pending',
            submittedAt: new Date().toISOString(),
            notes: vessel.specialNotes || '',
            ownerId: c.var.user!.id,
          }
        });
      }

      return vessel;
    });

    return c.json(normalizeVessel(newVessel));
  } catch (err) {
    console.error('[agent] post vessels', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

router.put('/vessels/:id', async (c) => {
  try {
    const vessel = await c.var.prisma.vessel.findUnique({ where: { id: c.req.param('id') } });
    if (!vessel) return c.json({ error: 'Not found' }, 404);
    if (vessel.ownerId !== c.var.user!.id) return c.json({ error: 'Forbidden' }, 403);

    const body = await c.req.json();
    const updated = await c.var.prisma.vessel.update({
      where: { id: c.req.param('id') },
      data: body,
      include: { timelineEvents: true },
    });
    return c.json(normalizeVessel(updated));
  } catch (err) {
    console.error('[agent] put vessels/:id', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

router.delete('/vessels/:id', async (c) => {
  try {
    const vessel = await c.var.prisma.vessel.findUnique({ where: { id: c.req.param('id') } });
    if (!vessel) return c.json({ error: 'Not found' }, 404);
    if (vessel.ownerId !== c.var.user!.id) return c.json({ error: 'Forbidden' }, 403);

    // hard delete for now
    await c.var.prisma.vessel.delete({ where: { id: c.req.param('id') } });
    return c.json({ success: true });
  } catch (err) {
    console.error('[agent] delete vessels/:id', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ─── Berth Requests ───────────────────────────────────────────────────────────

router.get('/berth-requests', async (c) => {
  try {
    const requests = await c.var.prisma.berthRequest.findMany({
      where: { ownerId: c.var.user!.id },
      orderBy: { submittedAt: 'desc' },
    });
    const mapped = requests.map(row => ({
      ...row,
      status: (row.status as string).replace('_', ' '),
    }));
    return c.json(mapped);
  } catch (err) {
    console.error('[agent] get berth-requests', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

router.post('/berth-requests', async (c) => {
  try {
    const data = await c.req.json();
    const newReq = await c.var.prisma.berthRequest.create({
      data: {
        id: `BR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        vesselId: data.vesselId,
        vesselName: data.vesselName,
        imo: data.imo,
        requestedBerth: data.requestedBerth,
        requestedArrivalTime: data.requestedArrivalTime,
        estimatedDurationHours: Number(data.estimatedDurationHours) || 20,
        requestedCranes: Number(data.requestedCranes) || 3,
        cargoType: data.cargoType,
        status: 'Pending',
        submittedAt: new Date().toISOString(),
        notes: data.notes || '',
        ownerId: c.var.user!.id,
      }
    });
    return c.json({ ...newReq, status: (newReq.status as string).replace('_', ' ') });
  } catch (err) {
    console.error('[agent] post berth-requests', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ─── Cargo ───────────────────────────────────────────────────────────────────

router.get('/cargo', async (c) => {
  try {
    const vessels = await c.var.prisma.vessel.findMany({
      where: { ownerId: c.var.user!.id },
      include: { timelineEvents: true },
      orderBy: { predictedWaitHours: 'desc' },
    });
    // For agent, returning vessels is sufficient to get cargo fields
    return c.json(vessels.map(normalizeVessel));
  } catch (err) {
    console.error('[agent] get cargo', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

router.put('/cargo/:vesselId', async (c) => {
  try {
    const vessel = await c.var.prisma.vessel.findUnique({ where: { id: c.req.param('vesselId') } });
    if (!vessel) return c.json({ error: 'Not found' }, 404);
    if (vessel.ownerId !== c.var.user!.id) return c.json({ error: 'Forbidden' }, 403);

    const cargoData = await c.req.json();
    const updated = await c.var.prisma.vessel.update({
      where: { id: c.req.param('vesselId') },
      data: {
        cargoType: cargoData.cargoType,
        cargoQuantity: cargoData.cargoQuantity,
        containersLoaded: cargoData.containersLoaded,
        containersTotal: cargoData.containersTotal,
        dangerousGoods: cargoData.dangerousGoods,
        specialNotes: cargoData.specialNotes,
      },
      include: { timelineEvents: true },
    });
    return c.json(normalizeVessel(updated));
  } catch (err) {
    console.error('[agent] put cargo/:vesselId', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ─── Documents ───────────────────────────────────────────────────────────────

router.get('/documents', async (c) => {
  try {
    const docs = await c.var.prisma.shippingDocument.findMany({
      where: { ownerId: c.var.user!.id },
      orderBy: { uploadedDate: 'desc' },
    });
    return c.json(docs);
  } catch (err) {
    console.error('[agent] get documents', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

router.post('/documents', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'] as File;
    const name = body['name'] as string;
    const vesselId = body['vesselId'] as string;
    const vesselName = body['vesselName'] as string;
    const type = body['type'] as string;

    if (!file) {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);
    const { data, error } = await supabase.storage.from('uploads').upload(`${crypto.randomUUID()}-${file.name}`, file);

    if (error) {
       console.error('[agent] supabase upload error', error);
       return c.json({ error: 'File upload failed' }, 500);
    }

    const doc = await c.var.prisma.shippingDocument.create({
      data: {
        id: `DOC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        name: name || file.name,
        vesselId,
        vesselName,
        type,
        status: 'Under Review',
        uploadedDate: new Date().toISOString(),
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        fileUrl: data.path,
        ownerId: c.var.user!.id,
      }
    });
    return c.json(doc);
  } catch (err) {
    console.error('[agent] post documents', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

router.delete('/documents/:id', async (c) => {
  try {
    const doc = await c.var.prisma.shippingDocument.findUnique({ where: { id: c.req.param('id') } });
    if (!doc) return c.json({ error: 'Not found' }, 404);
    if (doc.ownerId !== c.var.user!.id) return c.json({ error: 'Forbidden' }, 403);

    await c.var.prisma.shippingDocument.delete({ where: { id: c.req.param('id') } });
    if (doc.fileUrl) {
      const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);
      await supabase.storage.from('uploads').remove([doc.fileUrl]);
    }
    
    return c.json({ success: true });
  } catch (err) {
    console.error('[agent] delete documents/:id', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ─── Alerts & Schedules ───────────────────────────────────────────────────────

router.get('/alerts', async (c) => {
  try {
    const vessels = await c.var.prisma.vessel.findMany({
      where: { ownerId: c.var.user!.id },
      select: { id: true },
    });
    const vesselIds = vessels.map(v => v.id);

    const alerts = await c.var.prisma.operationalAlert.findMany({
      orderBy: { timestamp: 'desc' },
    });
    
    const agentAlerts = alerts.filter(a => {
      let rel = a.relatedEntity as any;
      if (typeof rel === 'string') {
        try { rel = JSON.parse(rel); } catch(e) {}
      }
      return rel && rel.type === 'vessel' && vesselIds.includes(rel.id);
    });

    return c.json(agentAlerts);
  } catch (err) {
    console.error('[agent] get alerts', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

router.get('/schedules', async (c) => {
  try {
    const vessels = await c.var.prisma.vessel.findMany({
      where: { ownerId: c.var.user!.id },
      select: { id: true },
    });
    const vesselIds = vessels.map(v => v.id);

    const shiftPlans = await c.var.prisma.shiftPlanItem.findMany({
      where: { vesselId: { in: vesselIds } },
      orderBy: [{ dayOffset: 'asc' }, { shift: 'asc' }],
    });
    return c.json(shiftPlans);
  } catch (err) {
    console.error('[agent] get schedules', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ─── Profile ──────────────────────────────────────────────────────────────────

router.get('/profile', async (c) => {
  try {
    const user = await c.var.prisma.user.findUnique({ where: { id: c.var.user!.id } });
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json(user);
  } catch (err) {
    console.error('[agent] get profile', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

router.put('/profile', async (c) => {
  try {
    const { name, email } = await c.req.json();
    const user = await c.var.prisma.user.update({
      where: { id: c.var.user!.id },
      data: { name, email },
    });
    return c.json(user);
  } catch (err) {
    console.error('[agent] put profile', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default router;
