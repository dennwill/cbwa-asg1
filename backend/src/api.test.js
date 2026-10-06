const test = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase } = require('./db');
const { createApp } = require('./app');

const single = {
  customerName: 'Jane Citizen',
  coverType: 'Single',
  applicant1Age: 35,
  applicant1CoverHistory: 'Yes',
  hospitalCover: 'Silver',
  extrasCover: 'Standard',
  paymentFrequency: 'Monthly',
  annualDiscount: 0,
};

const benchmark = {
  customerName: 'Benchmark Family',
  coverType: 'Family',
  applicant1Age: 40,
  applicant1CoverHistory: 'No',
  applicant2Age: 35,
  applicant2CoverHistory: 'Yes',
  hospitalCover: 'Silver',
  extrasCover: 'Standard',
  paymentFrequency: 'Yearly',
  annualDiscount: 5,
};

async function withServer(fn, { db = openDatabase(':memory:') } = {}) {
  const server = createApp(db).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const root = `http://127.0.0.1:${server.address().port}`;
  const base = `${root}/api/quotes`;
  const call = async (path, method = 'GET', body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  try {
    await fn(call, db, root);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('create returns 201 with the stored quote and its calculation', async () => {
  await withServer(async (call) => {
    const { status, body } = await call('', 'POST', single);
    assert.equal(status, 201);
    assert.equal(body.id, 1);
    assert.equal(body.customerName, 'Jane Citizen');
    assert.equal(body.applicant2Age, null);
    assert.match(body.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    assert.equal(body.calculation.monthlyPremium, 205);
  });
});

test('section 7 benchmark comes back through the API', async () => {
  await withServer(async (call) => {
    const { body } = await call('', 'POST', benchmark);
    assert.equal(body.calculation.hospitalPremium, 352);
    assert.equal(body.calculation.monthlyPremium, 472);
    assert.equal(body.calculation.yearlyBeforeDiscount, 5664);
    assert.equal(body.calculation.yearlyAfterDiscount, 5380.8);
  });
});

test('full create, read, update, delete cycle', async () => {
  await withServer(async (call) => {
    const created = (await call('', 'POST', single)).body;

    const fetched = await call(`/${created.id}`);
    assert.equal(fetched.status, 200);
    assert.equal(fetched.body.customerName, 'Jane Citizen');
    assert.ok(fetched.body.calculation.explanation.length > 0);

    const updated = await call(`/${created.id}`, 'PUT', { ...single, customerName: 'Janet', hospitalCover: 'Gold' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.customerName, 'Janet');
    assert.equal(updated.body.calculation.hospitalPremium, 220);
    assert.equal(updated.body.createdAt, created.createdAt);

    assert.equal((await call(`/${created.id}`, 'DELETE')).status, 204);
    assert.equal((await call(`/${created.id}`)).status, 404);
  });
});

test('list returns newest first with a summary total', async () => {
  await withServer(async (call) => {
    await call('', 'POST', single);
    await call('', 'POST', benchmark);
    const { status, body } = await call('');
    assert.equal(status, 200);
    assert.deepEqual(body.map((q) => q.customerName), ['Benchmark Family', 'Jane Citizen']);
    assert.deepEqual(body[0].summary, { monthlyPremium: 472, finalTotal: 5380.8, finalTotalPeriod: 'year' });
    assert.equal(body[0].calculation, undefined);
  });
});

test('empty list is an empty array', async () => {
  await withServer(async (call) => {
    assert.deepEqual((await call('')).body, []);
  });
});

test('update can change cover type from couple to single', async () => {
  await withServer(async (call) => {
    const { body: created } = await call('', 'POST', benchmark);
    const { status, body } = await call(`/${created.id}`, 'PUT', { ...single, customerName: 'Now single' });
    assert.equal(status, 200);
    assert.equal(body.applicant2Age, null);
    assert.equal(body.applicant2CoverHistory, null);
  });
});

test('invalid create returns 400 with field errors and stores nothing', async () => {
  await withServer(async (call) => {
    const { status, body } = await call('', 'POST', { ...benchmark, customerName: '', applicant2Age: undefined, annualDiscount: 50 });
    assert.equal(status, 400);
    assert.ok(body.details.customerName);
    assert.ok(body.details.applicant2Age);
    assert.ok(body.details.annualDiscount);
    assert.deepEqual((await call('')).body, []);
  });
});

test('invalid update returns 400 and leaves the quote unchanged', async () => {
  await withServer(async (call) => {
    const { body: created } = await call('', 'POST', single);
    const { status } = await call(`/${created.id}`, 'PUT', { ...single, applicant1Age: 5 });
    assert.equal(status, 400);
    assert.equal((await call(`/${created.id}`)).body.applicant1Age, 35);
  });
});

test('missing quotes give 404 for read, update and delete', async () => {
  await withServer(async (call) => {
    assert.equal((await call('/999')).status, 404);
    assert.equal((await call('/999', 'PUT', single)).status, 404);
    assert.equal((await call('/999', 'DELETE')).status, 404);
  });
});

test('bad ids give 400', async () => {
  await withServer(async (call) => {
    for (const id of ['abc', '0', '-1', '1.5', '1e3', '99999999999999999999']) {
      assert.equal((await call(`/${id}`)).status, 400, `id ${id}`);
      assert.equal((await call(`/${id}`, 'DELETE')).status, 400, `delete id ${id}`);
    }
  });
});

test('malformed JSON gives 400', async () => {
  await withServer(async (call) => {
    const { status, body } = await call('', 'POST', '{"customerName": ');
    assert.equal(status, 400);
    assert.match(body.error, /JSON/);
  });
});

test('missing or non-object bodies give 400, not a crash', async () => {
  await withServer(async (call) => {
    assert.equal((await call('', 'POST')).status, 400);
    assert.equal((await call('', 'POST', 'null')).status, 400);
    assert.equal((await call('', 'POST', '[]')).status, 400);
    assert.equal((await call('', 'POST', '"text"')).status, 400);
  });
});

test('oversized bodies give 413', async () => {
  await withServer(async (call) => {
    const { status } = await call('', 'POST', { ...single, notes: 'x'.repeat(200000) });
    assert.equal(status, 413);
  });
});

test('unknown api routes give a JSON 404', async () => {
  await withServer(async (call, db, root) => {
    const res = await fetch(`${root}/api/nothing`);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'Not found.' });
  });
});

test('database failure gives 500 without leaking details', async () => {
  const db = openDatabase(':memory:');
  await withServer(
    async (call) => {
      const errorLog = console.error;
      console.error = () => {};
      try {
        db.close();
        const { status, body } = await call('');
        assert.equal(status, 500);
        assert.equal(body.error, 'Something went wrong on the server.');
      } finally {
        console.error = errorLog;
      }
    },
    { db }
  );
});

test('search matches customer name and notes, ignoring case', async () => {
  await withServer(async (call) => {
    await call('', 'POST', single);
    await call('', 'POST', { ...benchmark, notes: 'Section 7 example' });

    const names = async (q) => (await call(`?q=${encodeURIComponent(q)}`)).body.map((x) => x.customerName);
    assert.deepEqual(await names('jane'), ['Jane Citizen']);
    assert.deepEqual(await names('  FAMILY '), ['Benchmark Family']);
    assert.deepEqual(await names('section 7'), ['Benchmark Family']);
    assert.deepEqual(await names('zzz'), []);
    assert.equal((await names('')).length, 2);
  });
});

test('search treats % and _ as plain characters', async () => {
  await withServer(async (call) => {
    await call('', 'POST', single);
    await call('', 'POST', { ...single, customerName: '100% Sure_Thing' });

    const names = async (q) => (await call(`?q=${encodeURIComponent(q)}`)).body.map((x) => x.customerName);
    assert.deepEqual(await names('%'), ['100% Sure_Thing']);
    assert.deepEqual(await names('_'), ['100% Sure_Thing']);
    assert.deepEqual(await names(String.fromCharCode(92)), []);
  });
});

test('repeated search parameters give 400', async () => {
  await withServer(async (call) => {
    assert.equal((await call('?q=a&q=b')).status, 400);
  });
});
