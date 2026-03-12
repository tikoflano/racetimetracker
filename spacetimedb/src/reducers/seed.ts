import spacetimedb from '../schema';
import { getUser, generateUniqueOrgName, uniqueOrgSlug, uniqueEventSlug } from '../lib/auth';
import { slugify } from '../lib/utils';
import { placeholderIdentity } from '../lib/utils';

export const seed_demo_data = spacetimedb.reducer((ctx) => {
  // Use the caller's existing org, or create a new one
  const caller = getUser(ctx);
  const ownerId = caller ? caller.id : 0n;
  let org = null;
  if (caller) {
    for (const o of ctx.db.organization.iter()) {
      if (o.owner_user_id === caller.id) {
        org = o;
        break;
      }
    }
  }
  if (!org) {
    const orgName = generateUniqueOrgName(ctx, 'Demo Racing Org');
    org = ctx.db.organization.insert({
      id: 0n,
      name: orgName,
      slug: uniqueOrgSlug(ctx, slugify(orgName)),
      owner_user_id: ownerId,
      registration_enabled: true,
    });
  }

  // Championships
  const champ1 = ctx.db.championship.insert({
    id: 0n,
    org_id: org.id,
    name: 'Enduro Series 2025',
    description: 'Regional enduro mountain bike series',
    color: '#3b82f6',
  });
  const champ2 = ctx.db.championship.insert({
    id: 0n,
    org_id: org.id,
    name: 'Downhill Cup 2025',
    description: 'Gravity-focused downhill racing',
    color: '#ef4444',
  });
  const champ3 = ctx.db.championship.insert({
    id: 0n,
    org_id: org.id,
    name: 'XC Marathon Series',
    description: 'Cross-country endurance events',
    color: '#22c55e',
  });

  // Locations
  const venue1 = ctx.db.venue.insert({
    id: 0n,
    org_id: org.id,
    name: 'Pine Mountain Bike Park',
    description: 'Technical enduro trails in the Blue Ridge',
    address: '1234 Mountain Rd, Blue Ridge, VA 24064',
  });
  const venue2 = ctx.db.venue.insert({
    id: 0n,
    org_id: org.id,
    name: 'Eagle Rock Resort',
    description: 'Steep downhill runs with jumps',
    address: '5678 Eagle Rock Dr, Hazleton, PA 18202',
  });
  const venue3 = ctx.db.venue.insert({
    id: 0n,
    org_id: org.id,
    name: 'Lakeside Trails',
    description: 'Rolling singletrack around the lake',
    address: '910 Lakeshore Blvd, Asheville, NC 28801',
  });

  // Tracks & variations
  const track1 = ctx.db.track.insert({
    id: 0n,
    venue_id: venue1.id,
    name: 'Widow Maker',
    color: '#ef4444',
  });
  const tv1 = ctx.db.track_variation.insert({
    id: 0n,
    track_id: track1.id,
    name: 'Full Send',
    description: 'Top-to-bottom with rock gardens and drops',
    start_latitude: 38.9,
    start_longitude: -77.04,
    end_latitude: 38.895,
    end_longitude: -77.035,
  });
  ctx.db.track_variation.insert({
    id: 0n,
    track_id: track1.id,
    name: 'Default',
    description: 'Standard route',
    start_latitude: 38.8977,
    start_longitude: -77.0365,
    end_latitude: 38.895,
    end_longitude: -77.035,
  });
  const track2 = ctx.db.track.insert({
    id: 0n,
    venue_id: venue1.id,
    name: 'Rock Garden',
    color: '#22c55e',
  });
  const tv2 = ctx.db.track_variation.insert({
    id: 0n,
    track_id: track2.id,
    name: 'Default',
    description: 'Technical rock garden descent',
    start_latitude: 38.899,
    start_longitude: -77.038,
    end_latitude: 38.894,
    end_longitude: -77.033,
  });
  const track3 = ctx.db.track.insert({
    id: 0n,
    venue_id: venue2.id,
    name: 'Thunderbolt',
    color: '#3b82f6',
  });
  const tv3 = ctx.db.track_variation.insert({
    id: 0n,
    track_id: track3.id,
    name: 'Race Line',
    description: 'Fast downhill with gap jumps',
    start_latitude: 40.92,
    start_longitude: -76.048,
    end_latitude: 40.915,
    end_longitude: -76.043,
  });
  ctx.db.track_variation.insert({
    id: 0n,
    track_id: track3.id,
    name: 'Default',
    description: 'Standard route',
    start_latitude: 40.9176,
    start_longitude: -76.0452,
    end_latitude: 40.915,
    end_longitude: -76.043,
  });
  const track4 = ctx.db.track.insert({
    id: 0n,
    venue_id: venue3.id,
    name: 'Lakeshore Loop',
    color: '#eab308',
  });
  const tv4 = ctx.db.track_variation.insert({
    id: 0n,
    track_id: track4.id,
    name: 'Full Loop',
    description: '25km singletrack loop',
    start_latitude: 35.598,
    start_longitude: -82.554,
    end_latitude: 35.595,
    end_longitude: -82.551,
  });
  ctx.db.track_variation.insert({
    id: 0n,
    track_id: track4.id,
    name: 'Default',
    description: 'Standard route',
    start_latitude: 35.5951,
    start_longitude: -82.5515,
    end_latitude: 35.595,
    end_longitude: -82.551,
  });

  const insertEvent = (
    champId: bigint,
    venueId: bigint,
    name: string,
    desc: string,
    start: string,
    end: string
  ) =>
    ctx.db.event.insert({
      id: 0n,
      org_id: org.id,
      championship_id: champId,
      venue_id: venueId,
      name,
      slug: uniqueEventSlug(ctx, org.id, slugify(name)),
      description: desc,
      start_date: start,
      end_date: end,
    });

  // Enduro Series events
  const evt1 = insertEvent(
    champ1.id,
    venue1.id,
    'Enduro R1 - Pine Mountain',
    'Opening round',
    '2025-03-15',
    '2025-03-16'
  );
  const evt2 = insertEvent(
    champ1.id,
    venue2.id,
    'Enduro R2 - Eagle Rock',
    'Second round',
    '2025-05-10',
    '2025-05-11'
  );
  const evt3 = insertEvent(
    champ1.id,
    venue3.id,
    'Enduro R3 - Lakeside',
    'Season finale',
    '2025-07-19',
    '2025-07-20'
  );
  const evtUpcoming = insertEvent(
    champ1.id,
    venue1.id,
    'Enduro R4 - Pine Mountain',
    'Upcoming round (not started yet)',
    '2029-09-20',
    '2029-09-21'
  );

  // Downhill Cup events
  const evt4 = insertEvent(
    champ2.id,
    venue2.id,
    'DH Cup R1 - Eagle Rock',
    'Downhill opener',
    '2025-04-05',
    '2025-04-06'
  );
  const evt5 = insertEvent(
    champ2.id,
    venue1.id,
    'DH Cup R2 - Pine Mountain',
    'Mid-season round',
    '2025-06-14',
    '2025-06-15'
  );

  // XC Marathon events
  const evt6 = insertEvent(
    champ3.id,
    venue3.id,
    'XC Marathon R1 - Lakeside',
    'Endurance opener',
    '2025-04-26',
    '2025-04-27'
  );
  const evt7 = insertEvent(
    champ3.id,
    venue1.id,
    'XC Marathon R2 - Pine Mountain',
    'Mountain stage',
    '2025-08-09',
    '2025-08-10'
  );

  // Event tracks
  const et1 = ctx.db.event_track.insert({
    id: 0n,
    event_id: evt1.id,
    track_variation_id: tv1.id,
    sort_order: 1,
  });
  const et2 = ctx.db.event_track.insert({
    id: 0n,
    event_id: evt1.id,
    track_variation_id: tv2.id,
    sort_order: 2,
  });
  ctx.db.event_track.insert({
    id: 0n,
    event_id: evt2.id,
    track_variation_id: tv3.id,
    sort_order: 1,
  });
  ctx.db.event_track.insert({
    id: 0n,
    event_id: evt3.id,
    track_variation_id: tv4.id,
    sort_order: 1,
  });
  ctx.db.event_track.insert({
    id: 0n,
    event_id: evt4.id,
    track_variation_id: tv3.id,
    sort_order: 1,
  });
  ctx.db.event_track.insert({
    id: 0n,
    event_id: evt5.id,
    track_variation_id: tv1.id,
    sort_order: 1,
  });
  ctx.db.event_track.insert({
    id: 0n,
    event_id: evt6.id,
    track_variation_id: tv4.id,
    sort_order: 1,
  });
  ctx.db.event_track.insert({
    id: 0n,
    event_id: evt7.id,
    track_variation_id: tv1.id,
    sort_order: 1,
  });
  ctx.db.event_track.insert({
    id: 0n,
    event_id: evtUpcoming.id,
    track_variation_id: tv1.id,
    sort_order: 1,
  });

  // Riders — 100 total for pagination demo
  const firstNames = [
    'Alex',
    'Sam',
    'Jordan',
    'Casey',
    'Taylor',
    'Riley',
    'Morgan',
    'Quinn',
    'Avery',
    'Skyler',
    'Jamie',
    'Drew',
    'Cameron',
    'Reese',
    'Parker',
    'Blake',
    'Finley',
    'Emery',
    'Hayden',
    'Kendall',
  ];
  const lastNames = [
    'Morgan',
    'Rivera',
    'Chen',
    'Brooks',
    'Kim',
    'Santos',
    'Lee',
    'Nguyen',
    'Patel',
    'Johnson',
    'Williams',
    'Brown',
    'Davis',
    'Miller',
    'Wilson',
    'Moore',
    'Anderson',
    'Thomas',
    'Jackson',
    'White',
  ];
  const riders: { id: bigint }[] = [];
  for (let i = 0; i < 100; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const year = 1985 + (i % 25);
    const month = String((i % 12) + 1).padStart(2, '0');
    const day = String((i % 28) + 1).padStart(2, '0');
    riders.push(
      ctx.db.rider.insert({
        id: 0n,
        org_id: org.id,
        first_name: fn,
        last_name: ln,
        email: `rider${i + 1}@example.com`,
        phone: `+1-555-${String(i + 1001).slice(-4)}`,
        date_of_birth: `${year}-${month}-${day}`,
        sex: i % 2 === 0 ? 'male' : 'female',
        profile_picture: '',
      })
    );
  }

  // Register first 4 riders for event 1
  for (let i = 0; i < 4; i++) {
    ctx.db.event_rider.insert({
      id: 0n,
      event_id: evt1.id,
      rider_id: riders[i].id,
      category_id: 0n,
      checked_in: false,
      assigned_number: 0,
    });
  }

  // Queue runs for first event's tracks
  for (const etId of [et1.id, et2.id]) {
    let order = 1;
    for (let i = 0; i < 4; i++) {
      ctx.db.run.insert({
        id: 0n,
        event_track_id: etId,
        rider_id: riders[i].id,
        sort_order: order++,
        status: 'queued',
        start_time: 0n,
        end_time: 0n,
      });
    }
  }

  // ─── Enduro R4 - Pine Mountain: categories, riders, event tracks ─────

  const etR4_1 = ctx.db.event_track.id.find(
    (() => {
      for (const et of ctx.db.event_track.iter()) {
        if (et.event_id === evtUpcoming.id && et.track_variation_id === tv1.id) return et.id;
      }
      return 0n;
    })()
  )!;
  const etR4_2 = ctx.db.event_track.insert({
    id: 0n,
    event_id: evtUpcoming.id,
    track_variation_id: tv2.id,
    sort_order: 2,
  });

  // Categories
  const catElite = ctx.db.event_category.insert({
    id: 0n,
    event_id: evtUpcoming.id,
    name: 'Elite',
    description: 'Pro and semi-pro riders',
    number_range_start: 1,
    number_range_end: 50,
  });
  const catSport = ctx.db.event_category.insert({
    id: 0n,
    event_id: evtUpcoming.id,
    name: 'Sport',
    description: 'Intermediate competitive riders',
    number_range_start: 51,
    number_range_end: 100,
  });
  const catBeginner = ctx.db.event_category.insert({
    id: 0n,
    event_id: evtUpcoming.id,
    name: 'Beginner',
    description: 'First-time riders welcome',
    number_range_start: 101,
    number_range_end: 150,
  });

  // Assign tracks to categories
  ctx.db.category_track.insert({
    id: 0n,
    category_id: catElite.id,
    event_track_id: etR4_1.id,
  });
  ctx.db.category_track.insert({
    id: 0n,
    category_id: catElite.id,
    event_track_id: etR4_2.id,
  });
  ctx.db.category_track.insert({
    id: 0n,
    category_id: catSport.id,
    event_track_id: etR4_1.id,
  });
  ctx.db.category_track.insert({
    id: 0n,
    category_id: catSport.id,
    event_track_id: etR4_2.id,
  });
  ctx.db.category_track.insert({
    id: 0n,
    category_id: catBeginner.id,
    event_track_id: etR4_1.id,
  });

  // Register all 100 riders for R4 with categories and assigned numbers
  for (let i = 0; i < 50; i++) {
    ctx.db.event_rider.insert({
      id: 0n,
      event_id: evtUpcoming.id,
      rider_id: riders[i].id,
      category_id: catElite.id,
      checked_in: false,
      assigned_number: i + 1,
    });
  }
  for (let i = 50; i < 100; i++) {
    ctx.db.event_rider.insert({
      id: 0n,
      event_id: evtUpcoming.id,
      rider_id: riders[i].id,
      category_id: catSport.id,
      checked_in: false,
      assigned_number: i + 1,
    });
  }

  // ─── Pending org members ─────────────────────────────────────────────

  const pendingData = [
    { email: 'pending-manager@example.com', name: 'Pending Manager', role: 'manager' },
    { email: 'pending-admin@example.com', name: 'Pending Admin', role: 'admin' },
    { email: 'pending-timekeeper@example.com', name: 'Pending Timekeeper', role: 'timekeeper' },
  ];
  for (const p of pendingData) {
    let existing = null;
    for (const u of ctx.db.user.iter()) {
      if (u.email === p.email) {
        existing = u;
        break;
      }
    }
    const userId = existing
      ? existing.id
      : ctx.db.user.insert({
          id: 0n,
          identity: placeholderIdentity(p.email),
          google_sub: `pending:${p.email}`,
          email: p.email,
          name: p.name,
          picture: '',
          is_super_admin: false,
        }).id;
    let alreadyMember = false;
    for (const m of ctx.db.org_member.iter()) {
      if (m.org_id === org.id && m.user_id === userId) {
        alreadyMember = true;
        break;
      }
    }
    if (!alreadyMember) {
      ctx.db.org_member.insert({
        id: 0n,
        org_id: org.id,
        user_id: userId,
        role: p.role,
      });
    }
    if (p.role === 'timekeeper') {
      ctx.db.timekeeper_assignment.insert({
        id: 0n,
        event_track_id: etR4_1.id,
        user_id: userId,
        position: 'start',
      });
      ctx.db.timekeeper_assignment.insert({
        id: 0n,
        event_track_id: etR4_2.id,
        user_id: userId,
        position: 'end',
      });
    }
  }
});
