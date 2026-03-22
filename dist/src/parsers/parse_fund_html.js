export function parseFundHtml(html) {
    const navMatch = html.match(/单位净值[^\d]*([0-9]+\.[0-9]+)/);
    const dateMatch = html.match(/净值日期[^\d]*(\d{4}-\d{2}-\d{2})/);
    const pausedBuy = /暂停申购/.test(html);
    const openBuy = /开放申购/.test(html);
    const pausedRedeem = /暂停赎回/.test(html);
    const openRedeem = /开放赎回/.test(html);
    const statusTextMatch = html.match(/(开放申购|暂停申购|开放赎回|暂停赎回)/);
    return {
        nav: navMatch ? Number(navMatch[1]) : null,
        navDate: dateMatch ? dateMatch[1] : null,
        subscriptionOpen: pausedBuy ? false : openBuy ? true : null,
        redemptionOpen: pausedRedeem ? false : openRedeem ? true : null,
        statusText: statusTextMatch ? statusTextMatch[1] : null
    };
}
