'use strict';
const { log } = require('../core/logger');
function startMemoryMonitor(intervalMs = 60000) {
  const timer = setInterval(() => {
    const { rss, heapUsed, heapTotal, external } = process.memoryUsage();
    const mb = v => Math.round(v / 1048576);
    log('info', 'memory', { rssMB: mb(rss), heapUsedMB: mb(heapUsed), heapTotalMB: mb(heapTotal), externalMB: mb(external) });
    if (rss > 700 * 1048576) log('warn', 'memory_near_760mb_limit', { rssMB: mb(rss) });
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
module.exports = { startMemoryMonitor };
