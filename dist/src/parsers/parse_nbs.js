export function parseNbs(json) {
    const returndata = (json.returndata ?? {});
    const datanodes = Array.isArray(returndata.datanodes) ? returndata.datanodes : [];
    return datanodes.map((node) => {
        const row = node;
        const code = typeof row.code === 'string' ? row.code : '';
        return {
            period: code.slice(-6),
            value: Number(row.data?.data ?? 0)
        };
    });
}
