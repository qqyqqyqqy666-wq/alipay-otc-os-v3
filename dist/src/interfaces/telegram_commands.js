export function renderHelpText() {
    return [
        'Available commands:',
        '/status',
        '/plans',
        '/recon',
        '/ack <plan_id>',
        '/confirm <pending_trade_id>'
    ].join('\n');
}
