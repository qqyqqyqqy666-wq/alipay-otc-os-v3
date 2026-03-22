export async function fetchFundHtml(fundCode: string): Promise<string> {
  const response = await fetch(`https://fund.eastmoney.com/${fundCode}.html`);
  if (!response.ok) throw new Error(`Fund HTML fetch failed: ${response.status}`);
  return await response.text();
}
