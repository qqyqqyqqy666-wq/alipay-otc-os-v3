export async function loadLatestObservationFrame(db) {
    const row = await db
        .prepare('SELECT observation_json FROM market_observation_snapshots ORDER BY as_of DESC LIMIT 1')
        .first();
    if (row === null || row === undefined) {
        throw new Error('MISSING_OBSERVATION: no rows in market_observation_snapshots');
    }
    let parsed;
    try {
        parsed = JSON.parse(row.observation_json);
    }
    catch {
        throw new Error('MALFORMED_OBSERVATION: observation_json is not valid JSON');
    }
    return strictParseObservationFrame(parsed);
}
export async function loadLatestRegimePosterior(db) {
    const row = await db
        .prepare('SELECT regime_json FROM regime_snapshots ORDER BY as_of DESC LIMIT 1')
        .first();
    if (row === null || row === undefined) {
        throw new Error('MISSING_REGIME: no rows in regime_snapshots');
    }
    let parsed;
    try {
        parsed = JSON.parse(row.regime_json);
    }
    catch {
        throw new Error('MALFORMED_REGIME: regime_json is not valid JSON');
    }
    return strictParseRegimePosterior(parsed);
}
function strictParseObservationFrame(raw) {
    if (raw === null || typeof raw !== 'object') {
        throw new Error('MALFORMED_OBSERVATION: root must be an object');
    }
    const r = raw;
    if (typeof r['as_of'] !== 'string' || r['as_of'] === '') {
        throw new Error('MALFORMED_OBSERVATION: missing or invalid field as_of');
    }
    if (r['source_values'] === null || typeof r['source_values'] !== 'object' || Array.isArray(r['source_values'])) {
        throw new Error('MALFORMED_OBSERVATION: missing or invalid field source_values');
    }
    if (r['source_confidence'] === null || typeof r['source_confidence'] !== 'object' || Array.isArray(r['source_confidence'])) {
        throw new Error('MALFORMED_OBSERVATION: missing or invalid field source_confidence');
    }
    if (r['source_freshness_minutes'] === null || typeof r['source_freshness_minutes'] !== 'object' || Array.isArray(r['source_freshness_minutes'])) {
        throw new Error('MALFORMED_OBSERVATION: missing or invalid field source_freshness_minutes');
    }
    if (r['channel'] !== 'ALIPAY' && r['channel'] !== 'TIANTIAN' && r['channel'] !== 'UNKNOWN') {
        throw new Error(`MALFORMED_OBSERVATION: channel must be ALIPAY|TIANTIAN|UNKNOWN, got ${String(r['channel'])}`);
    }
    const source_confidence = {};
    for (const [k, v] of Object.entries(r['source_confidence'])) {
        if (typeof v !== 'number') {
            throw new Error(`MALFORMED_OBSERVATION: source_confidence["${k}"] must be a number`);
        }
        source_confidence[k] = v;
    }
    const source_freshness_minutes = {};
    for (const [k, v] of Object.entries(r['source_freshness_minutes'])) {
        if (typeof v !== 'number') {
            throw new Error(`MALFORMED_OBSERVATION: source_freshness_minutes["${k}"] must be a number`);
        }
        source_freshness_minutes[k] = v;
    }
    return {
        as_of: r['as_of'],
        source_values: r['source_values'],
        source_confidence,
        source_freshness_minutes,
        channel: r['channel']
    };
}
function strictParseRegimePosterior(raw) {
    if (raw === null || typeof raw !== 'object') {
        throw new Error('MALFORMED_REGIME: root must be an object');
    }
    const r = raw;
    if (typeof r['as_of'] !== 'string' || r['as_of'] === '') {
        throw new Error('MALFORMED_REGIME: missing or invalid field as_of');
    }
    if (r['liquidity_state'] === null || typeof r['liquidity_state'] !== 'object' || Array.isArray(r['liquidity_state'])) {
        throw new Error('MALFORMED_REGIME: missing or invalid field liquidity_state');
    }
    if (r['risk_appetite_state'] === null || typeof r['risk_appetite_state'] !== 'object' || Array.isArray(r['risk_appetite_state'])) {
        throw new Error('MALFORMED_REGIME: missing or invalid field risk_appetite_state');
    }
    if (r['policy_state'] === null || typeof r['policy_state'] !== 'object' || Array.isArray(r['policy_state'])) {
        throw new Error('MALFORMED_REGIME: missing or invalid field policy_state');
    }
    if (typeof r['tail_prob'] !== 'number') {
        throw new Error('MALFORMED_REGIME: missing or invalid field tail_prob');
    }
    if (!Array.isArray(r['transition_matrix_1d'])) {
        throw new Error('MALFORMED_REGIME: transition_matrix_1d must be an array');
    }
    if (typeof r['half_life_days'] !== 'number') {
        throw new Error('MALFORMED_REGIME: missing or invalid field half_life_days');
    }
    const liquidity_state = {};
    for (const [k, v] of Object.entries(r['liquidity_state'])) {
        if (typeof v !== 'number') {
            throw new Error(`MALFORMED_REGIME: liquidity_state["${k}"] must be a number`);
        }
        liquidity_state[k] = v;
    }
    const risk_appetite_state = {};
    for (const [k, v] of Object.entries(r['risk_appetite_state'])) {
        if (typeof v !== 'number') {
            throw new Error(`MALFORMED_REGIME: risk_appetite_state["${k}"] must be a number`);
        }
        risk_appetite_state[k] = v;
    }
    const policy_state = {};
    for (const [k, v] of Object.entries(r['policy_state'])) {
        if (typeof v !== 'number') {
            throw new Error(`MALFORMED_REGIME: policy_state["${k}"] must be a number`);
        }
        policy_state[k] = v;
    }
    const transition_matrix_1d = r['transition_matrix_1d'];
    for (let i = 0; i < transition_matrix_1d.length; i++) {
        if (!Array.isArray(transition_matrix_1d[i])) {
            throw new Error(`MALFORMED_REGIME: transition_matrix_1d[${i}] must be an array`);
        }
        for (let j = 0; j < transition_matrix_1d[i].length; j++) {
            if (typeof transition_matrix_1d[i][j] !== 'number') {
                throw new Error(`MALFORMED_REGIME: transition_matrix_1d[${i}][${j}] must be a number`);
            }
        }
    }
    return {
        as_of: r['as_of'],
        liquidity_state,
        risk_appetite_state,
        policy_state,
        tail_prob: r['tail_prob'],
        transition_matrix_1d: transition_matrix_1d,
        half_life_days: r['half_life_days']
    };
}
